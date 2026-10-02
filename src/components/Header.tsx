import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useGame } from "../store/game";
import { MAX_SLOTS } from "../domain/leveling";
import { setMuted, sfx } from "../lib/sfx";
import { useMuted } from "../lib/useMuted";
import { LANGS, num, setLang, type Lang } from "../i18n";
import { MusicControl } from "../features/music";
import { ItemsButton } from "../features/items";
import { MerchantButton } from "../features/merchant";
import { CharacterButton, DecorEmblem } from "../features/equipment";
import { SectionSwitch } from "../features/temporal";

export function Emblem({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="emblem" aria-hidden>
      <rect x="10" y="10" width="44" height="44" transform="rotate(45 32 32)" fill="none" stroke="var(--gold)" strokeWidth="1.5" />
      <rect x="15" y="15" width="34" height="34" transform="rotate(45 32 32)" fill="rgba(214,178,94,.06)" stroke="var(--gold-lo)" strokeWidth="1" />
      <rect x="23" y="25" width="18" height="14" rx="1.5" fill="none" stroke="var(--gold-hi)" strokeWidth="1.5" />
      <path d="M27 30h7M27 34h5M36 33.5l2 1.5-2 1.5" stroke="var(--gold-hi)" strokeWidth="1.3" fill="none" />
    </svg>
  );
}

export function Header() {
  const player = useGame((s) => s.state.player);
  const active = useGame((s) => [...s.state.quests.values()].filter((q) => q.status === "active").length);
  const muted = useMuted();
  const { t } = useTranslation();

  const pct = Math.min(100, (player.levelXp / player.levelXpNeeded) * 100);

  return (
    <header className="hdr">
      <div className="hdr-brand">
        <DecorEmblem fallback={<Emblem />} />
        <div>
          <h1>Quest Board</h1>
          <p className="tag">Requests &amp; Bounties</p>
        </div>
        <SectionSwitch />
      </div>

      <div className="hdr-right">
        <div className="hdr-block">
          <span className="hdr-lbl">{t("header.adventurer")}</span>
          <div className="hdr-lv">
            <span>{t("header.rank")}</span>
            <b className="num rank">{player.rank}</b>
            <span>{t("header.level")}</span>
            <b className="num">{player.level}</b>
            <CharacterButton />
          </div>
          <div className="xpbar" title={t("header.xpTotal", { xp: num(player.xp) })}>
            <span className="xpbar-lbl">XP</span>
            <div className="xpbar-track">
              <div className="xpbar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="num xpbar-val">
              {num(player.levelXp)}
              <small> / {num(player.levelXpNeeded)}</small>
            </span>
          </div>
        </div>

        <div className="hdr-block">
          <span className="hdr-lbl">{t("header.treasure")}</span>
          <div className="hdr-gold">
            <GoldIcon />
            <b className="num">{num(player.gold)}</b>
            <span className="muted">G</span>
            <ItemsButton />
            <MerchantButton />
          </div>
          <div className="slots" title={t("header.slotsTitle")}>
            <span className="xpbar-lbl">{t("header.slots")}</span>
            {Array.from({ length: MAX_SLOTS }, (_, i) => (
              <span
                key={i}
                className={`slot ${i < active ? "on" : i < player.maxActive ? "free" : "locked"}`}
              />
            ))}
            <span className="num slots-val">
              {active}
              <small> / {player.maxActive}</small>
            </span>
          </div>
        </div>

        <LangSwitch />
        <MusicControl />
        <button
          className="mute"
          title={muted ? t("header.soundOn") : t("header.mute")}
          aria-pressed={muted}
          onClick={() => setMuted(!muted)}
        >
          {muted ? "♪̸" : "♪"}
        </button>
      </div>
    </header>
  );
}

function LangSwitch() {
  const { t, i18n } = useTranslation();
  return (
    <div className="lang" role="radiogroup" aria-label={t("header.language")} title={t("header.language")}>
      {(Object.keys(LANGS) as Lang[]).map((l) => {
        const on = i18n.language === l;
        return (
          <button
            key={l}
            role="radio"
            aria-checked={on}
            className={`lang-btn ${on ? "on" : ""}`}
            lang={l}
            onClick={() => {
              if (on) return;
              sfx.move();
              setLang(l);
            }}
          >
            {on && <motion.span layoutId="lang-hl" className="lang-hl" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
            <span className="lang-lbl">{LANGS[l].label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function GoldIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="gold-icon">
      <rect x="2.5" y="2.5" width="9" height="9" transform="rotate(45 7 7)" fill="none" stroke="var(--gold)" strokeWidth="1.3" />
      <rect x="5" y="5" width="4" height="4" transform="rotate(45 7 7)" fill="var(--gold)" />
    </svg>
  );
}
