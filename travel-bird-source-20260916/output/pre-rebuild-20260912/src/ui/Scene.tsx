import type { CSSProperties } from "react";
import { CROPS } from "../domain/config";
import { getCropPhase } from "../domain/game";
import type { BirdMood } from "../domain/birdMood";
import type { GameState } from "../domain/types";
import { BirdArt, CropArt, ItemArt } from "./Art";

export const MOOD_LABELS = { calm: "平静", happy: "高兴", sleepy: "打盹", angry: "生气" };
const moodNotes = { calm: "陪我坐一会儿吧", happy: "和你在一起，真好", sleepy: "呼……在做一个软软的梦", angry: "让我安静一小会儿嘛" };
const position = (x: number, y: number, width: number, height?: number): CSSProperties => ({ left: `${x}%`, top: `${y}%`, width: `${width}%`, ...(height ? { height: `${height}%` } : {}) });

export function Scene({ scene, game, now, mood, atHome, status, onBird, onScene, onInventory, onKitchen, onAlbum, onBag, onPlot, cabinetHint }: {
  scene: "home" | "garden"; game: GameState; now: number; mood: BirdMood; atHome: boolean; status: string;
  onBird: () => void; onScene: () => void; onInventory: () => void; onKitchen: () => void; onAlbum: () => void; onBag: () => void; onPlot: (id: string) => void; cabinetHint: boolean;
}) {
  const indoor = scene === "home";
  return <div className="scene-view">
    <div className="scene-heading"><div><p className="eyebrow">{indoor ? "林间日常 · HOME" : "树下时光 · GARDEN"}</p><h2>{indoor ? "啾啾的树屋".replace("啾啾", game.bird.name) : "树屋旁的小菜园"}</h2></div><span className="scene-weather">{indoor ? "一室暖光" : "微风，宜播种"}</span></div>
    <section className={`scene scene-${scene}`} aria-label={indoor ? "树屋室内" : "室外菜地"}>
      <img className="scene-background" src={`/art/${indoor ? "indoor" : "outdoor"}.webp`} alt={indoor ? "圆窗、木梯、厨房和错层床铺组成的温馨树屋" : "森林里一座带圆窗和入口的树屋，树枝下是菜地"} fetchPriority="high" />
      {indoor ? <>
        <button className="scene-object cabinet" style={position(5, 68, 33)} aria-label="打开柜子查看库存" onClick={onInventory}><img src="/art/cabinet.webp" alt="木质物品柜" /><span className="object-label">物品柜</span></button>
        {cabinetHint && <span className="cabinet-hint">点柜子查看物品</span>}
        <button className="scene-hotspot kitchen-hotspot" style={position(2, 38, 29, 18)} aria-label="打开厨房" onClick={onKitchen}><span className="object-label">厨房</span></button>
        <button className="scene-hotspot album-hotspot" style={position(58, 4, 32, 17)} aria-label="查看明信片墙" onClick={onAlbum}><span className="object-label">明信片</span></button>
        <button className="scene-object satchel" style={position(44, 78, 20)} aria-label="准备行囊" onClick={onBag}><ItemArt name="satchel" /><span className="object-label">行囊</span></button>
        <button className="scene-hotspot door-hotspot" style={position(80, 61, 20, 26)} aria-label="从门口前往菜园" onClick={onScene}><span className="object-label">去菜园 →</span></button>
      </> : <>
        <button className="scene-hotspot entry-hotspot" style={position(63, 21, 23, 17)} aria-label="从树屋入口回家" onClick={onScene}><span className="object-label">回树屋 →</span></button>
        {game.plots.map((plot, index) => {
          const phase = getCropPhase(plot, now);
          const centers = [[12, 60], [54, 64], [29, 74]];
          const [x, y] = centers[index % centers.length];
          return <button key={plot.id} data-plot={plot.id} className={`scene-object garden-plot ${phase.kind}`} style={position(x, y, 35)}
            aria-label={`${index + 1}号地块：${plot.cropId ? CROPS[plot.cropId].name : "空地"}，${phase.kind === "ready" ? "点击收获" : phase.kind === "growing" ? "查看生长进度" : "点击播种"}`} onClick={() => onPlot(plot.id)}>
            <ItemArt name="soil" className="plot-soil" />
            {plot.cropId && <CropArt cropId={plot.cropId} stage={phase.kind === "ready" ? "ready" : "growing"} />}
            <span className="object-label">{phase.kind === "ready" ? "收获" : phase.kind === "growing" ? `${Math.ceil(phase.remainingMs / 1000)}秒` : "播种"}</span>
          </button>;
        })}
        <img src="/art/foreground.webp" className="scene-foreground" alt="" />
      </>}
      {atHome && <button type="button" className={`scene-bird mood-${mood}`} data-mood={mood} aria-label={`${game.bird.name}，${MOOD_LABELS[mood]}，轻点互动`} onClick={onBird}
        style={position(indoor ? 68 : 30, indoor ? 51.5 : 33.5, 25)}>
        <BirdArt mood={mood} />
      </button>}
    </section>
    <div className="scene-caption" aria-live="polite"><strong>{atHome ? game.bird.name : "旅途来信"}</strong><span>{atHome ? moodNotes[mood] : status}</span>{atHome && <small>{MOOD_LABELS[mood]}</small>}</div>
    {!atHome && <button className="journey-entry" onClick={onBag}>{status.includes("回来") ? "拆开旅行的礼物" : "看看旅行进度"}</button>}
  </div>;
}
