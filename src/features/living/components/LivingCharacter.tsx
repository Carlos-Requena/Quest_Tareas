import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { calm } from "../../../lib/fx";
import { sfx } from "../../../lib/sfx";
import { useBlobUrl } from "../../equipment/useBlobUrl";
import type { MenuCharacter } from "../../menu/characters";
import { isVideoMime } from "../../menu/media";
import { createStage, glSupported, PAD, type Stage, type StageParams } from "../gl";
import { AURA_TOKEN, LEVEL_AMOUNT, type CharacterStyle } from "../model";
import { Particles } from "./Particles";
import "../living.css";

interface Size {
  w: number;
  h: number;
}

/** Dónde cabe la imagen en el hueco: entera, centrada y de pie sobre el borde de abajo. */
function fit(box: Size, media: Size) {
  const k = Math.min(box.w / media.w, box.h / media.h);
  const w = media.w * k;
  const h = media.h * k;
  return { left: (box.w - w) / 2, top: box.h - h, width: w, height: h };
}

const amounts = (s: CharacterStyle): StageParams => ({ breath: LEVEL_AMOUNT[s.breath], sway: LEVEL_AMOUNT[s.sway], wind: LEVEL_AMOUNT[s.wind] });

interface Props {
  c: MenuCharacter;
  style: CharacterStyle;
  /** Reproduce la entrada al montarse si es «gacha»; cambiar el número la repite (vista previa). */
  entrance?: number;
  /** Retraso de la entrada, en segundos (el menú espera a su barrido). */
  delay?: number;
  /** Sin sonido en la entrada (la vista previa de la personalización lo pide aparte). */
  quiet?: boolean;
  className?: string;
}

/**
 * Un personaje vivo: su imagen con la malla de WebGL (respira, se mece, le da el viento),
 * el aura, el barrido de luz, las partículas y la entrada. Llena su caja: la imagen cabe
 * entera, de pie sobre el borde de abajo. Si es un vídeo o una imagen animada, si el
 * navegador no sabe WebGL o si se pide «reducir movimiento», la imagen se mueve con CSS (o
 * nada) y el resto sigue igual.
 */
export function LivingCharacter({ c, style, entrance, delay = 0, quiet, className = "" }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const inRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | undefined>(undefined);

  const blob = useBlobUrl(c.builtin ? undefined : c.blobId);
  const full = c.src ?? blob;
  const src = full ?? c.thumb;
  const video = !!blob && isVideoMime(c.mime);
  const still = calm();

  const [box, setBox] = useState<Size>();
  const [media, setMedia] = useState<Size>();
  const [loaded, setLoaded] = useState<string>();
  const [gl, setGl] = useState(false);
  const wantGl = !still && !!full && loaded === full && !video && !c.animated && glSupported();

  // Tamaño de la caja.
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rect = box && media && box.w > 0 && box.h > 0 ? fit(box, media) : undefined;

  // La malla: se monta cuando la imagen grande ya está cargada (se sube tal cual como textura).
  useEffect(() => {
    const img = imgRef.current;
    if (!wantGl || !img) return;
    const s = createStage(img, amounts(style), () => {
      stage.current = undefined;
      setGl(false);
    });
    if (!s) return;
    s.canvas.className = "lv-canvas";
    host.current?.appendChild(s.canvas);
    stage.current = s;
    setGl(true);
    return () => {
      s.destroy();
      stage.current = undefined;
      setGl(false);
    };
    // El estilo entra por setParams; aquí solo importa si hay malla y con qué imagen.
  }, [wantGl, full]);

  useEffect(() => {
    if (gl && rect) stage.current?.resize(rect.width, rect.height, Math.min(2, window.devicePixelRatio || 1));
  }, [gl, rect?.width, rect?.height]);

  useEffect(() => {
    if (gl) stage.current?.setParams(amounts(style));
  }, [gl, style.breath, style.sway, style.wind]);

  // Entrada «gacha»: silueta en negro, destello, anillos y rayos, y el personaje se revela.
  // GSAP controla la visibilidad de .lv-in y del destello; React no la toca.
  const gacha = style.entrance === "gacha" && entrance !== undefined;
  useEffect(() => {
    const el = inRef.current;
    const burst = burstRef.current;
    if (!el || !burst) return;
    const parts = burst.querySelectorAll<HTMLElement>(".lv-flash, .lv-ring, .lv-rays");
    if (!gacha || still) {
      gsap.set(el, { opacity: 1, scale: 1, filter: "none" });
      gsap.set(parts, { opacity: 0 });
      return;
    }
    const tl = gsap.timeline({ delay });
    tl.set(el, { opacity: 0, scale: 1.07, filter: "brightness(0) saturate(0)" })
      .set(parts, { opacity: 0 })
      .to(el, { opacity: 1, duration: 0.28, ease: "power1.out" })
      .to(el, { scale: 1.03, duration: 0.32, ease: "sine.inOut" })
      .call(() => {
        if (!quiet) sfx.glint();
      })
      .fromTo(burst.querySelector(".lv-flash"), { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1.25, duration: 0.16, ease: "power2.out" }, ">-0.04")
      .to(el, { filter: "brightness(2.6) saturate(0.4)", duration: 0.12 }, "<")
      .fromTo(burst.querySelectorAll(".lv-ring"), { opacity: 0.95, scale: 0.25 }, { opacity: 0, scale: 1.9, duration: 0.85, ease: "power2.out", stagger: 0.12 }, "<")
      .fromTo(burst.querySelector(".lv-rays"), { opacity: 0.85, rotate: -20, scale: 0.6 }, { opacity: 0, rotate: 25, scale: 1.4, duration: 1.1, ease: "power1.out" }, "<")
      .to(burst.querySelector(".lv-flash"), { opacity: 0, scale: 1.9, duration: 0.5, ease: "power1.in" }, "<0.16")
      .to(el, { filter: "brightness(1) saturate(1)", scale: 1, duration: 0.6, ease: "power2.out" }, "<");
    return () => {
      tl.kill();
      gsap.set(el, { opacity: 1, scale: 1, filter: "none" });
      gsap.set(parts, { opacity: 0 });
    };
  }, [gacha, entrance, delay, still, quiet]);

  const aura = style.aura !== "none" ? AURA_TOKEN[style.aura] : undefined;
  const vars = {
    "--lv-aura": aura ?? "var(--gold)",
    "--lv-breath": LEVEL_AMOUNT[style.breath],
    "--lv-sway": LEVEL_AMOUNT[style.sway],
    "--lv-pad-x": `${PAD.x * 100}%`,
    "--lv-pad-top": `${PAD.top * 100}%`,
  } as CSSProperties;
  const place: CSSProperties = rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : { inset: 0 };
  const cssMotion = !gl && !still && (style.breath > 0 || style.sway > 0);
  const thumb = !full;

  return (
    <div ref={boxRef} className={`lv ${className}`} style={vars} aria-hidden>
      <div className="lv-place" style={place}>
        {aura && <span className={`lv-aura ${still ? "" : "is-live"}`} />}
        <div ref={inRef} className="lv-in">
          <div className={`lv-frame ${style.fade ? "is-fade" : ""} ${aura ? "has-aura" : ""}`}>
            <div className={`lv-body ${cssMotion ? "is-moving" : ""}`}>
              {video ? (
                <video
                  className="lv-media"
                  src={blob}
                  poster={c.thumb}
                  autoPlay
                  muted
                  loop
                  playsInline
                  disablePictureInPicture
                  onLoadedMetadata={(e) => setMedia({ w: e.currentTarget.videoWidth || 1, h: e.currentTarget.videoHeight || 1 })}
                />
              ) : (
                src && (
                  <img
                    ref={imgRef}
                    className={`lv-media ${thumb ? "is-thumb" : ""} ${gl ? "is-hidden" : ""}`}
                    src={src}
                    alt=""
                    draggable={false}
                    onLoad={(e) => {
                      setMedia({ w: e.currentTarget.naturalWidth || 1, h: e.currentTarget.naturalHeight || 1 });
                      setLoaded(e.currentTarget.getAttribute("src") ?? undefined);
                    }}
                  />
                )
              )}
              <div ref={host} className="lv-host" />
              {style.shine && full && !video && !still && <span className="lv-shine" style={{ maskImage: `url("${full}")`, WebkitMaskImage: `url("${full}")` }} />}
            </div>
          </div>
        </div>
        {!still && <Particles kind={style.particles} />}
        <div ref={burstRef} className="lv-burst">
          <span className="lv-rays" />
          <span className="lv-ring" />
          <span className="lv-ring" />
          <span className="lv-flash" />
        </div>
      </div>
    </div>
  );
}
