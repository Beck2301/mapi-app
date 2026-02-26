// Script sencillo de ETL: ArcGIS FeatureServer -> Supabase (Postgres + PostGIS)
// Uso:
//   1) Asegúrate de tener DATABASE_URL en .env.local (ya lo tienes).
//   2) Edita FEATURE_LAYER_URL, ROUTE_CODE y ROUTE_NAME con la ruta que quieras importar.
//   3) Ejecuta:
//        node scripts/import-route-from-arcgis.js
//
// Requiere Node 18+ (para usar fetch nativo).

/* eslint-disable no-console */

// Carga .env.local / .env.* igual que Next.js, para que al ejecutar:
//   node scripts/import-route-from-arcgis.js
// también existan process.env.DATABASE_URL, etc.
// (No requiere instalar dotenv.)
const { loadEnvConfig } = require("@next/env");
loadEnvConfig(process.cwd());

const { Client } = require("pg");
const fs = require("node:fs");
const path = require("node:path");

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    "Falta DATABASE_URL. Asegúrate de definirla en .env.local antes de ejecutar este script."
  );
  process.exit(1);
}

// TODO: reemplaza esta URL por la del FeatureServer de la ruta específica (ej. 101D)
// Ejemplo de endpoint base: https://services9.arcgis.com/.../FeatureServer/0
const FEATURE_LAYER_URL = process.env.ARCGIS_FEATURE_LAYER_URL || "";

// Metadatos básicos de la ruta que estarás importando
const ROUTE_CODE = process.env.ROUTE_CODE || "101D"; // código interno, ej. '101D'
const ROUTE_NAME =
  process.env.ROUTE_NAME || "Ruta 101D (Ejemplo importada desde ArcGIS)";
const ROUTE_SOURCE_LAYER = process.env.ROUTE_SOURCE_LAYER || "vmt_arcgis_layer";

if (!FEATURE_LAYER_URL) {
  console.error(
    "Debes definir ARCGIS_FEATURE_LAYER_URL en tu .env.local con la URL del FeatureServer (terminada en /FeatureServer/0)."
  );
  process.exit(1);
}

async function fetchGeoJSON() {
  const url = new URL(`${FEATURE_LAYER_URL}/query`);
  url.searchParams.set("where", "1=1");
  url.searchParams.set("outFields", "*");
  url.searchParams.set("f", "geojson");

  console.log("Consultando ArcGIS:", url.toString());

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Error al consultar ArcGIS: ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();

  if (!data || data.type !== "FeatureCollection") {
    throw new Error("La respuesta de ArcGIS no es un FeatureCollection GeoJSON.");
  }

  return data;
}

async function main() {
  console.log("Iniciando importación desde ArcGIS hacia Supabase...");

  const client = new Client({
    connectionString: DATABASE_URL,
  });

  await client.connect();

  try {
    const geojson = await fetchGeoJSON();

    // Opcional: guardar copia local del GeoJSON por inspección manual
    const dumpPath = path.join(
      process.cwd(),
      "scripts",
      `dump-${ROUTE_CODE.toLowerCase()}.geojson`
    );
    fs.writeFileSync(dumpPath, JSON.stringify(geojson, null, 2), "utf8");
    console.log("GeoJSON guardado en:", dumpPath);

    // 1) Insertar la ruta base en tabla routes
    console.log("Insertando ruta en tabla routes...");

    const insertRouteResult = await client.query(
      `
      insert into public.routes (code, name, description, source, source_layer, source_raw)
      values ($1, $2, $3, $4, $5, $6)
      on conflict (code) do update
        set name = excluded.name,
            description = excluded.description,
            source = excluded.source,
            source_layer = excluded.source_layer,
            source_raw = excluded.source_raw
      returning id;
    `,
      [
        ROUTE_CODE,
        ROUTE_NAME,
        "Ruta importada desde ArcGIS (FeatureServer).",
        "vmt_arcgis",
        ROUTE_SOURCE_LAYER,
        geojson,
      ]
    );

    const routeId = insertRouteResult.rows[0]?.id;

    if (!routeId) {
      throw new Error("No se pudo obtener el id de la ruta recién insertada.");
    }

    console.log("Ruta id:", routeId);

    // 2) Dividir features en puntos (paradas) y líneas (recorridos)
    const pointFeatures = [];
    const lineFeatures = [];

    for (const feature of geojson.features || []) {
      const geomType = feature.geometry?.type;
      if (!geomType) continue;

      if (geomType === "Point") {
        pointFeatures.push(feature);
      } else if (
        geomType === "LineString" ||
        geomType === "MultiLineString"
      ) {
        lineFeatures.push(feature);
      }
    }

    console.log(
      `Features: ${geojson.features?.length ?? 0} (puntos: ${
        pointFeatures.length
      }, líneas: ${lineFeatures.length})`
    );

    // 3) Insertar paradas (stops)
    if (pointFeatures.length > 0) {
      console.log("Insertando paradas en tabla stops...");

      let sequence = 1;

      for (const feature of pointFeatures) {
        const props = feature.properties || {};
        const objectId =
          props.OBJECTID ||
          props.OBJECTID_1 ||
          props.id ||
          props.Id ||
          null;

        const name =
          props.name ||
          props.NOMBRE ||
          props.Nombre ||
          props.title ||
          `Parada ${sequence}`;

        const geomJson = JSON.stringify(feature.geometry);

        await client.query(
          `
          insert into public.stops (
            route_id,
            name,
            sequence,
            geom,
            source,
            source_layer,
            source_object_id,
            source_raw
          )
          values (
            $1,
            $2,
            $3,
            ST_SetSRID(ST_GeomFromGeoJSON($4), 4326),
            $5,
            $6,
            $7,
            $8
          );
        `,
          [
            routeId,
            name,
            sequence,
            geomJson,
            "vmt_arcgis",
            ROUTE_SOURCE_LAYER,
            objectId,
            props,
          ]
        );

        sequence += 1;
      }

      console.log(`Paradas insertadas: ${pointFeatures.length}`);
    } else {
      console.log(
        "No se encontraron geometrías Point en el FeatureLayer; se omite inserción de paradas."
      );
    }

    // 4) Insertar recorridos (route_paths)
    if (lineFeatures.length > 0) {
      console.log("Insertando recorridos en tabla route_paths...");

      for (const feature of lineFeatures) {
        const props = feature.properties || {};
        const objectId =
          props.OBJECTID ||
          props.OBJECTID_1 ||
          props.id ||
          props.Id ||
          null;

        const direction =
          props.direction ||
          props.sentido ||
          props.SENTIDO ||
          props.DIRECTION ||
          null;

        const geomJson = JSON.stringify(feature.geometry);

        await client.query(
          `
          insert into public.route_paths (
            route_id,
            direction,
            geom,
            length_meters,
            source,
            source_layer,
            source_object_id,
            source_raw
          )
          values (
            $1,
            $2,
            ST_SetSRID(ST_GeomFromGeoJSON($3), 4326),
            ST_Length(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)::geography),
            $4,
            $5,
            $6,
            $7
          );
        `,
          [
            routeId,
            direction,
            geomJson,
            "vmt_arcgis",
            ROUTE_SOURCE_LAYER,
            objectId,
            props,
          ]
        );
      }

      console.log(`Recorridos insertados: ${lineFeatures.length}`);
    } else {
      console.log(
        "No se encontraron geometrías LineString/MultiLineString en el FeatureLayer; se omite inserción de route_paths."
      );
    }

    console.log("Importación completada correctamente.");
  } catch (error) {
    console.error("Error durante la importación:", error);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Error inesperado:", err);
  process.exit(1);
});

