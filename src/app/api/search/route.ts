import { NextRequest, NextResponse } from "next/server";
import { Client } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

export async function GET(request: NextRequest) {
  if (!DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL no configurada" }, { status: 500 });
  }

  const { searchParams } = request.nextUrl;
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) return NextResponse.json({ results: [] });

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const result = await client.query(
      `
      SELECT DISTINCT
        r.code,
        r.name,
        r.description,
        -- Campos básicos decodificados
        r.source_raw->>'d_ORIGEN'    AS origen,
        r.source_raw->>'d_DESTINO'   AS destino,
        r.source_raw->>'d_TIPO_RUT'  AS tipo_ruta,
        r.source_raw->>'d_TIPO_UNI'  AS tipo_unidad,
        r.source_raw->>'d_RECORRID'  AS recorrido,
        -- Campos operacionales
        r.source_raw->>'TARIFA_AUT'  AS tarifa,
        r.source_raw->>'TARIFA_EXC'  AS tarifa_excedente,
        r.source_raw->>'KILOMETROS'  AS kilometros,
        r.source_raw->>'CODIGO_RUT'  AS codigo_rut,
        -- Horarios lunes-viernes
        r.source_raw->>'H_INIC_LV'   AS h_inicio_lv,
        r.source_raw->>'H_FIN_LV'    AS h_fin_lv,
        -- Horarios sábado-domingo
        r.source_raw->>'H_INIC_SD'   AS h_inicio_sd,
        r.source_raw->>'H_FIN_SD'    AS h_fin_sd,
        -- Comentario
        r.source_raw->>'Comentario'  AS comentario,
        -- Código de zona / municipio
        r.source_raw->>'NA2'         AS municipio
      FROM public.routes r
      WHERE
        r.source_raw->>'d_ORIGEN'  ILIKE $1
        OR r.source_raw->>'d_DESTINO' ILIKE $1
        OR r.code                     ILIKE $1
        OR r.name                     ILIKE $1
        OR r.source_raw->>'CODIGO_RUT' ILIKE $1
      ORDER BY r.code ASC
      LIMIT 20;
      `,
      [`%${q}%`]
    );

    return NextResponse.json({ results: result.rows });
  } catch (error) {
    console.error("[Search] Error:", error);
    return NextResponse.json({ error: "Error interno en búsqueda." }, { status: 500 });
  } finally {
    await client.end();
  }
}
