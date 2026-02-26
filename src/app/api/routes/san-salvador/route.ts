import { NextResponse } from "next/server";
import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

// Capa 7 = San Salvador
const ARCGIS_LAYER_URL =
  "https://services9.arcgis.com/4ZwMO9wShTnUDuWy/arcgis/rest/services/Rutas_Dashboard/FeatureServer/7/query";

// La API de ArcGIS devuelve máximo 2000 registros por request (maxRecordCount).
// Usamos paginación con resultOffset para no perder nada.
const PAGE_SIZE = 1000;

async function fetchAllFeaturesFromArcGIS(): Promise<any[]> {
  let offset = 0;
  const allFeatures: any[] = [];

  while (true) {
    const url = new URL(ARCGIS_LAYER_URL);
    url.searchParams.set("where", "1=1");
    url.searchParams.set("outFields", "*");
    url.searchParams.set("f", "geojson");
    url.searchParams.set("resultRecordCount", String(PAGE_SIZE));
    url.searchParams.set("resultOffset", String(offset));

    console.log(`[ArcGIS] Fetching offset=${offset}...`);
    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`Error en ArcGIS (offset=${offset}): ${res.statusText}`);
    }

    const data = await res.json();

    if (!data.features || data.features.length === 0) {
      // No hay más páginas
      break;
    }

    allFeatures.push(...data.features);

    // Si vino menos de lo que pedimos, ya no hay más páginas
    if (data.features.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return allFeatures;
}

export async function GET() {
  if (!DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL no está configurada" },
      { status: 500 }
    );
  }

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // 1. Verificar si ya tenemos rutas de San Salvador en Supabase (Cache Hit)
    const cacheCheck = await client.query(
      `SELECT COUNT(*) as total FROM public.routes WHERE source_layer = '7'`
    );

    const cachedCount = parseInt(cacheCheck.rows[0].total, 10);

    if (cachedCount > 0) {
      // Ya hay rutas cacheadas, devolver desde Supabase
      console.log(`[Cache Hit] ${cachedCount} rutas de San Salvador en Supabase.`);

      const result = await client.query(`
        SELECT
          rp.id,
          ST_AsGeoJSON(rp.geom)::json AS geom_json,
          rp.direction,
          rp.source_raw,
          r.code,
          r.name AS route_name
        FROM public.route_paths rp
        JOIN public.routes r ON r.id = rp.route_id
        WHERE r.source_layer = '7'
      `);

      const features = result.rows.map((row) => ({
        type: "Feature",
        geometry: row.geom_json,
        properties: {
          id: row.id,
          code: row.code,
          name: row.route_name,
          direction: row.direction,
          ...(row.source_raw || {}),
        },
      }));

      return NextResponse.json(
        { type: "FeatureCollection", features },
        {
          headers: {
            // Decirle al browser que cachee la respuesta por 5 minutos
            "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
          },
        }
      );
    }

    // 2. Cache Miss -> Traer todas las rutas de ArcGIS con paginación
    console.log("[Cache Miss] Iniciando fetch de todas las rutas de San Salvador desde ArcGIS...");

    const allFeatures = await fetchAllFeaturesFromArcGIS();

    if (allFeatures.length === 0) {
      return NextResponse.json(
        { error: "ArcGIS no devolvió ninguna ruta para San Salvador." },
        { status: 404 }
      );
    }

    console.log(`[ArcGIS] Total de recorridos obtenidos: ${allFeatures.length}`);

    // 3. Guardar en Supabase (en transacción)
    await client.query("BEGIN");

    // Agrupar features por NAME (código de ruta) para insertar una sola fila por ruta
    const routeMap = new Map<string, any[]>();

    for (const feature of allFeatures) {
      const props = feature.properties || {};
      const routeCode = props.NAME || props.CODIGO_RUT || `UNKNOWN_${feature.id}`;

      if (!routeMap.has(routeCode)) {
        routeMap.set(routeCode, []);
      }
      routeMap.get(routeCode)!.push(feature);
    }

    console.log(`[DB] ${routeMap.size} rutas únicas a insertar...`);

    // Insertar cada ruta y sus recorridos
    for (const [routeCode, features] of routeMap.entries()) {
      const firstProps = features[0].properties || {};
      const routeName = routeCode;
      const description = `${firstProps.d_ORIGEN || ""} - ${firstProps.d_DESTINO || ""}`;

      // Insertar ruta base
      const routeRes = await client.query(
        `
        INSERT INTO public.routes (code, name, description, source, source_layer, source_raw)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (code) DO UPDATE
          SET name        = EXCLUDED.name,
              description = EXCLUDED.description,
              source_raw  = EXCLUDED.source_raw
        RETURNING id;
        `,
        [routeCode, routeName, description, "vmt_arcgis", "7", JSON.stringify(firstProps)]
      );

      const routeId = routeRes.rows[0].id;

      // Insertar todos los lineFeatures de esta ruta
      const lineFeatures = features.filter(
        (f) =>
          f.geometry &&
          (f.geometry.type === "LineString" || f.geometry.type === "MultiLineString")
      );

      for (const lf of lineFeatures) {
        const props = lf.properties || {};
        const objectId = props.OBJECTID || props.OBJECTID_1 || null;
        const direction = props.d_RECORRID || props.RECORRIDO || null;
        const geomJson = JSON.stringify(lf.geometry);

        await client.query(
          `
          INSERT INTO public.route_paths (
            route_id, direction, geom, length_meters,
            source, source_layer, source_object_id, source_raw
          )
          VALUES (
            $1, $2,
            ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)),
            ST_Length(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)::geography),
            $4, $5, $6, $7
          )
          ON CONFLICT DO NOTHING;
          `,
          [routeId, direction, geomJson, "vmt_arcgis", "7", objectId, JSON.stringify(props)]
        );
      }
    }

    await client.query("COMMIT");
    console.log("[DB] Todas las rutas de San Salvador guardadas en Supabase.");

    // 4. Devolver las features directamente desde ArcGIS (sin releer la DB)
    const responseFeatures = allFeatures
      .filter(
        (f) =>
          f.geometry &&
          (f.geometry.type === "LineString" || f.geometry.type === "MultiLineString")
      )
      .map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          code: f.properties?.NAME || f.properties?.CODIGO_RUT,
          direction: f.properties?.d_RECORRID || f.properties?.RECORRIDO,
        },
      }));

    return NextResponse.json(
      { type: "FeatureCollection", features: responseFeatures },
      {
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[Error] al obtener rutas de San Salvador:", error);
    return NextResponse.json(
      { error: "Error interno al procesar rutas de San Salvador." },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}
