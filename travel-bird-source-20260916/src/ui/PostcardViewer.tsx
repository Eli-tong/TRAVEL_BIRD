import { useId, useState } from "react";
import type { AlbumEntry, PostcardId } from "../domain/types";
import { POSTCARDS } from "../domain/config";
import { destinationName, postcardStory, postcardTitle } from "../i18n/content";
import { useTranslation } from "../i18n/LanguageContext";
import { Modal } from "./Modal";
import { PostcardArt } from "./Art";
import { postcardCopySize } from "./postcardLayout";
import "./postcard.css";

type PostcardViewerProps = {
  postcardId: PostcardId;
  entry: AlbumEntry;
  birdName: string;
  onClose: () => void;
};

const formatPostcardDate = (value: number, language: string) =>
  new Intl.DateTimeFormat(language, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));

export function PostcardViewer({ postcardId, entry, birdName, onClose }: PostcardViewerProps) {
  const { language, t } = useTranslation();
  const [side, setSide] = useState<"front" | "back">("front");
  const cardId = useId();
  const postcard = POSTCARDS[postcardId];
  const title = postcardTitle(t, postcardId);
  const message = postcardId === "first-dandelion-hill-selfie" ? t("postcard.message") : postcardStory(t, postcardId);
  const sender = entry.birdNameSnapshot ?? birdName;

  return <Modal title={t("postcard.modalTitle")} className="postcard-viewer-modal" onClose={onClose}>
    <div className="postcard-viewer" lang={language}>
      <div id={cardId} className="postcard-stage">
        {side === "front" ? <figure className="postcard-front postcard-face postcard-earned-front">
          <PostcardArt postcardId={postcardId} />
        </figure> : <article className="postcard-back postcard-face" data-copy-size={postcardCopySize(message)} aria-label={t("postcard.back")} style={{ backgroundImage: 'url("/art/postcards/postcard-paper-back-dandelion.webp")' }}>
          <div className="postcard-message">
            {message.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
          <div className="postcard-address">
            <div><span>{t("postcard.from")}</span><p>{destinationName(t, postcard.destinationId)}</p></div>
            <div><span>{t("postcard.date")}</span><p><time dateTime={new Date(entry.firstCollectedAt).toISOString()}>{formatPostcardDate(entry.firstCollectedAt, language)}</time></p></div>
            <p className="postcard-signature">{t("postcard.signature", { birdName: sender })}</p>
            <span className="postcard-mobile-stamp" aria-hidden="true" />
          </div>
        </article>}
      </div>
      <p className="postcard-location-tag">{title}</p>
      <button type="button" className="postcard-flip" aria-controls={cardId} onClick={() => setSide(side === "front" ? "back" : "front")}>
        {side === "front" ? t("postcard.toBack") : t("postcard.toFront")}
      </button>
    </div>
  </Modal>;
}
