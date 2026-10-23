import { useId, useState } from "react";
import { FIRST_TRIP_POSTCARD } from "../domain/config";
import type { PostcardSnapshot } from "../domain/types";
import { translate, type Language } from "../i18n/dictionary";
import { Modal } from "./Modal";
import { postcardCopySize } from "./postcardLayout";
import "./postcard.css";

// Deliberately has no GameState setter or collection/reward callback.
export function PostcardPreview({ snapshot, language, onClose }: {
  snapshot: PostcardSnapshot; language: Language; onClose: () => void;
}) {
  const [side, setSide] = useState<"front" | "back">("front");
  const cardId = useId();
  const t = (key: Parameters<typeof translate>[1], values?: Parameters<typeof translate>[2]) => translate(language, key, values);
  const card = FIRST_TRIP_POSTCARD;
  const front = card.birdArtVariants[snapshot.birdVariant];
  const message = t(card.messageKey);
  const dated = snapshot.travelDate !== null && Number.isFinite(snapshot.travelDate) ? new Date(snapshot.travelDate) : null;
  return <Modal title={t("postcard.previewTitle")} className="postcard-preview-modal" onClose={onClose}>
    <div className="postcard-preview" lang={language}>
      <div className="postcard-tools">
        <span className="postcard-side-label" role="status">{side === "front" ? t("postcard.front") : t("postcard.back")}</span>
      </div>
      <div id={cardId} className="postcard-stage">
        {side === "front" ? <figure key="front" className="postcard-front postcard-face">
          {front ? <img src={front} alt={t("postcard.frontAlt")} draggable={false} /> : <p className="postcard-missing">{t("postcard.missingBird")}</p>}
        </figure> : <article key="back" className="postcard-back postcard-face" data-copy-size={postcardCopySize(message)} aria-label={t("postcard.back")} style={{ backgroundImage: `url("${card.backArtKey}")` }}>
          <div className="postcard-message">
            {message.split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>)}
          </div>
          <div className="postcard-address">
            <div><span>{t("postcard.from")}</span><p>{t(card.locationNameKey)}</p></div>
            <div><span>{t("postcard.date")}</span><p>{dated ? <time dateTime={dated.toISOString()}>{new Intl.DateTimeFormat(language, { year: "numeric", month: "short", day: "numeric" }).format(dated)}</time> : t("postcard.datePending")}</p></div>
            <p className="postcard-signature">{t("postcard.signature", { birdName: snapshot.birdNameSnapshot })}</p>
            <span className="postcard-mobile-stamp" aria-hidden="true" />
          </div>
        </article>}
      </div>
      <p className="postcard-location-tag">{t(card.locationNameKey)}</p>
      <button type="button" className="postcard-flip" aria-controls={cardId} onClick={() => setSide(side === "front" ? "back" : "front")}>
        {side === "front" ? t("postcard.toBack") : t("postcard.toFront")}
      </button>
      <p className="postcard-preview-note">{t("postcard.previewNote")}</p>
    </div>
  </Modal>;
}
