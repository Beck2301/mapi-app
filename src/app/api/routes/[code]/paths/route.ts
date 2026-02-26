import { NextResponse } from "next/server";
import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
// URL base del FeatureServer (Capa 7 = San Salvador)
const ARCGIS_URL =
  "https://services9.arcgis.com/4ZwMO9wShTnUDuWy/arcgis/rest/services/Rutas_Dashboard/FeatureServer/7/query";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL no está configurada" },
      { status: 500 }
    );
  }

  // Next.js 15: params es una Promesa, hay que awaitearlo
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode);
  const client = new Client({ connectionString: DATABASE_URL });

  await client.connect();

  try {
    // 1. Intentar obtener la ruta desde Supabase (Caché Hit)
    const dbResult = await client.query(
      `
      SELECT 
        rp.id, 
        ST_AsGeoJSON(rp.geom)::json as geom_json,
        rp.direction,
        r.name as route_name
      FROM public.route_paths rp
      JOIN public.routes r ON r.id = rp.route_id
      WHERE r.code = $1
      `,
      [code]
    );

    // Si encontramos recorridos en la DB, los retornamos
    if (dbResult.rowCount && dbResult.rowCount > 0) {
      console.log(`[Cache Hit] Ruta ${code} encontrada en Supabase.`);

      const features = dbResult.rows.map((row) => ({
        type: "Feature",
        geometry: row.geom_json,
        properties: {
          id: row.id,
          code,
          direction: row.direction,
          name: row.route_name,
        },
      }));

      return NextResponse.json({
        type: "FeatureCollection",
        features,
      });
    }

    // 2. Caché Miss -> Buscar en la API de ArcGIS (VMT)
    console.log(`[Cache Miss] Buscando ruta ${code} en ArcGIS (San Salvador)...`);

    const arcgisUrl = new URL(ARCGIS_URL);
    // Probamos coincidencia tanto en NAME como en CODIGO_RUT
    arcgisUrl.searchParams.set("where", `NAME='${code}' OR CODIGO_RUT='${code}'`);
    arcgisUrl.searchParams.set("outFields", "*");
    arcgisUrl.searchParams.set("f", "geojson");

    const arcgisRes = await fetch(arcgisUrl.toString());
    if (!arcgisRes.ok) {
      throw new Error(`Error en API de ArcGIS: ${arcgisRes.statusText}`);
    }

    const geojson = await arcgisRes.json();

    if (!geojson || geojson.type !== "FeatureCollection" || !geojson.features || geojson.features.length === 0) {
      return NextResponse.json(
        { error: `No se encontró la ruta ${code} ni en la Base de Datos ni en ArcGIS.` },
        { status: 404 }
      );
    }

    // 3. Transformar y guardar en Supabase usando Transacciones
    console.log(`Guardando nueva ruta ${code} en Supabase...`);
    
    // Iniciar transacción
    await client.query("BEGIN");

    // Tomamos propiedades del primer feature para la tabla 'routes'
    const firstFeatureProps = geojson.features[0].properties || {};
    const routeName = firstFeatureProps.NAME || firstFeatureProps.CODIGO_RUT || code;
    
    // Insertamos la ruta base
    const insertRouteResult = await client.query(
      `
      INSERT INTO public.routes (code, name, description, source, source_layer, source_raw)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (code) DO UPDATE
        SET name = EXCLUDED.name,
            source_raw = EXCLUDED.source_raw
      RETURNING id;
      `,
      [code, routeName, `Ruta obtenida dinámicamente: ${firstFeatureProps.d_ORIGEN} - ${firstFeatureProps.d_DESTINO}`, "vmt_arcgis", "7", JSON.stringify(firstFeatureProps)]
    );

    const routeId = insertRouteResult.rows[0].id;

    // Filtramos los lineFeatures (los recorridos de la ruta)
    // También pueden venir paradas (Point) dependiendo de la capa, en este caso las polyline.
    const lineFeatures = geojson.features.filter((f: any) => 
      f.geometry && (f.geometry.type === "LineString" || f.geometry.type === "MultiLineString")
    );

    for (const feature of lineFeatures) {
      const props = feature.properties || {};
      const objectId = props.OBJECTID || props.OBJECTID_1 || props.id || null;
      // Usamos el campo d_RECORRID (que vimos que trae "Ida" / "Regreso" etc)
      const direction = props.d_RECORRID || props.RECORRIDO || null;
      
      const geomJson = JSON.stringify(feature.geometry);

      // Usamos ST_Multi para garantizar validación en route_paths
      await client.query(
        `
        INSERT INTO public.route_paths (
          route_id,
          direction,
          geom,
          length_meters,
          source,
          source_layer,
          source_object_id,
          source_raw
        )
        VALUES (
          $1,
          $2,
          ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($3), 4326)),
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
          "7",
          objectId,
          JSON.stringify(props)
        ]
      );
    }

    await client.query("COMMIT");
    console.log(`[Éxito] Ruta ${code} guardada en Supabase.`);

    // 4. Devolver la respuesta directamente desde el geojson que acabamos de guardar
    // Le inyectamos el ID interconectado para que los features mantengan uniformidad 
    const responseFeatures = lineFeatures.map((f: any) => ({
      ...f,
      properties: {
        ...f.properties,
        code,
        direction: f.properties?.d_RECORRID || f.properties?.RECORRIDO
      }
    }));

    return NextResponse.json({
      type: "FeatureCollection",
      features: responseFeatures,
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error obteniendo rutas:", error);
    return NextResponse.json(
      { error: "Error interno procesando la ruta." },
      { status: 500 }
    );
  } finally {
    await client.end();
  }
}

