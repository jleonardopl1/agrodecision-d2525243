import { useEffect, useRef, useState } from "react";
import maplibregl, {
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { VegetacaoCollection } from "@/hooks/use-vegetacao";

export type MetricaVeg = "anomalia" | "ndvi";

const FONTE = "vegetacao";
const CAMADA_FILL = "vegetacao-fill";
const CAMADA_LINHA = "vegetacao-linha";

// Estilo base sem chave de API (raster OSM). Para produção com tráfego real,
// troque por um provedor de tiles com plano adequado — a política de uso do
// tile.openstreetmap.org não cobre uso pesado.
const ESTILO_BASE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

// Anomalia de NDVI vs. mesma janela do ano anterior: vermelho = abaixo do
// normal (alerta de oferta), verde = acima.
const COR_ANOMALIA: ExpressionSpecification = [
  "interpolate", ["linear"], ["coalesce", ["get", "ndvi_anomalia"], 0],
  -0.2, "#d73027", -0.05, "#fdae61", 0, "#ffffbf", 0.05, "#a6d96a", 0.2, "#1a9850",
];

// NDVI absoluto (saúde da vegetação): marrom (solo) -> verde escuro (vigor).
const COR_NDVI: ExpressionSpecification = [
  "interpolate", ["linear"], ["coalesce", ["get", "ndvi"], 0],
  0.1, "#a6611a", 0.3, "#dfc27d", 0.5, "#c7eae5", 0.7, "#5ab4ac", 0.85, "#01665e",
];

const corPorMetrica = (m: MetricaVeg): ExpressionSpecification =>
  m === "ndvi" ? COR_NDVI : COR_ANOMALIA;

export function MapaVegetacao({
  data,
  metrica = "anomalia",
}: {
  data: VegetacaoCollection;
  metrica?: MetricaVeg;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [carregado, setCarregado] = useState(false);

  // Cria o mapa uma única vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: ESTILO_BASE,
      center: [-52, -15],
      zoom: 3.4,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setCarregado(true));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      setCarregado(false);
    };
  }, []);

  // Cria/atualiza fonte e camadas quando os dados mudam.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !carregado) return;

    const fonte = map.getSource(FONTE) as GeoJSONSource | undefined;
    if (fonte) {
      fonte.setData(data);
      return;
    }

    map.addSource(FONTE, { type: "geojson", data });
    map.addLayer({
      id: CAMADA_FILL,
      type: "fill",
      source: FONTE,
      paint: { "fill-color": corPorMetrica(metrica), "fill-opacity": 0.7 },
    });
    map.addLayer({
      id: CAMADA_LINHA,
      type: "line",
      source: FONTE,
      paint: { "line-color": "#1e293b", "line-width": 0.4, "line-opacity": 0.5 },
    });

    const popup = new maplibregl.Popup({ closeButton: false });
    const txt = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));
    const num = (v: unknown, casas = 3) =>
      v === null || v === undefined || v === "" ? "—" : Number(v).toFixed(casas);

    map.on("click", CAMADA_FILL, (e) => {
      const f = e.features?.[0] as MapGeoJSONFeature | undefined;
      if (!f) return;
      const p = f.properties as Record<string, unknown>;
      popup
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="font:13px/1.5 system-ui,sans-serif">
            <strong>${txt(p.nome)} / ${txt(p.uf)}</strong><br/>
            NDVI: ${num(p.ndvi)} · anomalia: ${num(p.ndvi_anomalia)}<br/>
            NDMI: ${num(p.ndmi)} · nuvem: ${num(p.cobertura_nuvem, 2)}<br/>
            <span style="color:#64748b">janela até ${txt(p.data_fim)}</span>
          </div>`,
        )
        .addTo(map);
    });
    map.on("mouseenter", CAMADA_FILL, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", CAMADA_FILL, () => {
      map.getCanvas().style.cursor = "";
    });
  }, [data, carregado, metrica]);

  // Recolore sem recriar a camada quando a métrica muda.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !carregado || !map.getLayer(CAMADA_FILL)) return;
    map.setPaintProperty(CAMADA_FILL, "fill-color", corPorMetrica(metrica));
  }, [metrica, carregado]);

  return <div ref={containerRef} className="h-full w-full" />;
}
