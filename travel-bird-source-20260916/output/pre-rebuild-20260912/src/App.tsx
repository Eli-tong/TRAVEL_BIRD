import { BookOpen, ChefHat, Download, Home, Map, RotateCcw, Settings, Sprout, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CROPS, DESTINATIONS, POSTCARDS, RECIPES, TRAVEL_EVENTS } from "./domain/config";
import {
  claimCooking,
  claimTravel,
  createNewGame,
  exportSave,
  getCookingPhase,
  getCropPhase,
  getCropDuration,
  getJourneyPhase,
  getMissingIngredients,
  harvestPlot,
  importSave,
  markIntroSeen,
  renameBird,
  setBagFood,
  setMode,
  startCooking,
  startPlanting,
  startTravel
} from "./domain/game";
import type { CropId, FoodId, GameState, Mode, PostcardId, TravelLogEntry } from "./domain/types";
import { BirdArt, CropArt, FoodArt, PostcardArt } from "./ui/Art";

import { Scene } from "./ui/Scene";
import { Modal } from "./ui/Modal";
import { useBirdMood } from "./ui/useBirdMood";

const SAVE_KEY = "travel-bird-save-v1";
type Tab = "home" | "garden" | "kitchen" | "album";

const useClock = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 500);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return now;
};

const loadInitialGame = () => {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { game: createNewGame(), locked: false, error: "" };
    const result = importSave(raw);
    if (result.ok) return { game: result.game, locked: false, error: "" };
    return { game: createNewGame(), locked: true, error: result.error };
  } catch {
    return { game: createNewGame(), locked: false, error: "浏览器存储不可用，当前进度可能无法自动保存。" };
  }
};

const formatTime = (ms: number) => {
  const safe = Math.max(0, ms);
  const totalSeconds = Math.ceil(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}分${seconds.toString().padStart(2, "0")}秒` : `${seconds}秒`;
};

const formatDate = (value: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

const rewardText = (entry: Pick<TravelLogEntry, "reward">) => {
  const parts: string[] = [];
  for (const [id, amount] of Object.entries(entry.reward.seeds)) {
    if (amount) parts.push(`${CROPS[id as CropId].seedName} x${amount}`);
  }
  for (const [id, amount] of Object.entries(entry.reward.materials)) {
    if (amount) parts.push(`${CROPS[id as CropId].materialName} x${amount}`);
  }
  for (const id of entry.reward.unlocks.crops) parts.push(`解锁${CROPS[id].name}`);
  for (const id of entry.reward.unlocks.recipes) parts.push(`解锁${RECIPES[id].name}`);
  for (const id of entry.reward.unlocks.destinations) parts.push(`解锁${DESTINATIONS[id].name}`);
  return parts.join("、") || "带回一阵好心情";
};

export default function App() {
  const initial = useMemo(loadInitialGame, []);
  const [game, setGame] = useState<GameState>(initial.game);
  const [tab, setTab] = useState<Tab>("home");
  const [saveLocked, setSaveLocked] = useState(initial.locked);
  const [storageMessage, setStorageMessage] = useState(initial.error);
  const [toast, setToast] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState<string | null>(null);
  const [selectedPostcard, setSelectedPostcard] = useState<PostcardId | null>(null);
  const [rewardModal, setRewardModal] = useState<TravelLogEntry | null>(null);
  const [importText, setImportText] = useState("");
  const [resetArmed, setResetArmed] = useState(false);
  const now = useClock();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [cabinetHint, setCabinetHint] = useState(() => {
    try { return !localStorage.getItem("travel-bird-cabinet-seen"); } catch { return true; }
  });
  const gameRef = useRef(game);
  gameRef.current = game;
  const atHome = !game.currentJourney;
  const bird = useBirdMood(atHome, (tab === "home" || tab === "garden") && game.settings.seenIntro);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const navigate = (next: Tab) => { setSelectedPlot(null); setTab(next); };
  const openInventory = () => {
    setInventoryOpen(true); setCabinetHint(false);
    try { localStorage.setItem("travel-bird-cabinet-seen", "1"); } catch { /* Hint remains session-only. */ }
  };

  useEffect(() => {
    if (saveLocked) return;
    try {
      window.localStorage.setItem(SAVE_KEY, exportSave(game));
      if (storageMessage === "浏览器存储不可用，当前进度可能无法自动保存。") setStorageMessage("");
    } catch {
      setStorageMessage("自动保存失败：当前浏览器可能禁用了存储，建议导出存档备份。");
    }
  }, [game, saveLocked, storageMessage]);

  const action = (fn: (state: GameState) => GameState, ok = "已完成") => {
    try {
      const next = fn(gameRef.current);
      gameRef.current = next;
      setGame(next);
      setToast(ok);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "操作失败");
    }
  };

  const cookingPhase = getCookingPhase(game.cooking, now);
  const journeyPhase = getJourneyPhase(game.currentJourney, now);
  const collectedIds = new Set(game.album.collected.map((entry) => entry.postcardId));

  const handleClaimTravel = () => {
    if (!game.currentJourney) return;
    action((state) => {
      const next = claimTravel(state, now);
      setRewardModal(next.travelLog[0]);
      return next;
    }, "欢迎回家");
  };

  const handleImport = () => {
    const result = importSave(importText);
    if (!result.ok) {
      setToast(`导入失败：${result.error}`);
      return;
    }
    setGame(result.game);
    setSaveLocked(false);
    setStorageMessage("");
    setSettingsOpen(false);
    setToast("存档已导入");
  };

  return (
    <div className="page-shell">
      <main className="phone-frame">
        <header className="topbar">
          <div>
            <p className="eyebrow">FOREST POST · 森林邮记</p>
            <h1>旅行小鸟</h1>
          </div>
          <button className="icon-button" type="button" aria-label="设置" onClick={() => setSettingsOpen(true)}>
            <Settings size={22} />
          </button>
        </header>

        {storageMessage && (
          <section className="notice">
            <p>{saveLocked ? `检测到损坏存档：${storageMessage}` : storageMessage}</p>
            {saveLocked && (
              <div className="row">
                <button type="button" onClick={() => setSettingsOpen(true)}>
                  导入备份
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setSaveLocked(false);
                    setStorageMessage("");
                    setGame(createNewGame(now));
                  }}
                >
                  覆盖并重新开始
                </button>
              </div>
            )}
          </section>
        )}

        <section className="content">
          {(tab === "home" || tab === "garden") && (
            <Scene scene={tab} game={game} now={now} mood={bird.mood} atHome={atHome}
              status={journeyPhase.kind === "traveling" ? "还需 " + formatTime(journeyPhase.remainingMs) + "，正在收集沿途的故事" : "已经回来，等你拆开明信片"}
              onBird={bird.onClick} onScene={() => navigate(tab === "home" ? "garden" : "home")}
              onInventory={openInventory} onKitchen={() => navigate("kitchen")} onAlbum={() => navigate("album")}
              onBag={() => setBagOpen(true)} cabinetHint={cabinetHint}
              onPlot={(id) => {
                const plot = game.plots.find((item) => item.id === id);
                if (plot && getCropPhase(plot, now).kind === "ready") action((state) => harvestPlot(state, id, Date.now()), "收获完成，种子也收好了");
                else setSelectedPlot(id);
              }} />
          )}
          {tab === "kitchen" && (
            <KitchenView
              game={game}
              now={now}
              cookingPhase={cookingPhase}
              onCook={(recipeId) => action((state) => startCooking(state, recipeId, now), "开始烹饪")}
              onClaim={() => action((state) => claimCooking(state, now), "食物做好啦")}
            />
          )}
          {tab === "album" && (
            <AlbumView
              game={game}
              collectedIds={collectedIds}
              onOpen={(postcardId) => setSelectedPostcard(postcardId)}
            />
          )}
        </section>

        <nav className="bottom-nav" aria-label="主要导航">
          <NavButton active={tab === "home"} label="小屋" icon={<Home size={21} />} onClick={() => navigate("home")} />
          <NavButton active={tab === "garden"} label="菜园" icon={<Sprout size={21} />} onClick={() => navigate("garden")} />
          <NavButton active={tab === "kitchen"} label="厨房" icon={<ChefHat size={21} />} onClick={() => navigate("kitchen")} />
          <NavButton active={tab === "album"} label="相册" icon={<BookOpen size={21} />} onClick={() => navigate("album")} />
        </nav>
      </main>

      {toast && (
        <button className="toast" type="button" onClick={() => setToast("")}>
          {toast}
        </button>
      )}

      {!game.settings.seenIntro && (
        <IntroModal
          onChoose={(mode) => {
            setGame((state) => markIntroSeen(setMode(state, mode, now), now));
            setToast(mode === "demo" ? "快速试玩已开启" : "悠闲体验已开启");
          }}
        />
      )}

      {inventoryOpen && <Modal title="物品柜" onClose={() => setInventoryOpen(false)}><InventoryPanel game={game} /></Modal>}
      {bagOpen && <Modal title="准备下一次旅行" onClose={() => setBagOpen(false)}>
        <BagView game={game} now={now} journeyPhase={journeyPhase}
          onBag={(foodId) => action((state) => setBagFood(state, foodId), foodId ? "已放入行囊" : "已清空行囊")}
          onStart={() => { action((state) => startTravel(state, Date.now()), "带着好心情出发了"); setBagOpen(false); }}
          onClaim={() => { handleClaimTravel(); setBagOpen(false); }} />
      </Modal>}
      {selectedPlot && <PlotModal game={game} now={now} plotId={selectedPlot} onClose={() => setSelectedPlot(null)}
        onPlant={(id, cropId) => { action((state) => startPlanting(state, id, cropId, Date.now()), "种下去了"); setSelectedPlot(null); }}
        onHarvest={(id) => { action((state) => harvestPlot(state, id, Date.now()), "收获完成"); setSelectedPlot(null); }} />}

      {settingsOpen && (
        <SettingsModal
          game={game}
          importText={importText}
          resetArmed={resetArmed}
          onClose={() => setSettingsOpen(false)}
          onRename={(name) => action((state) => renameBird(state, name, now), "名字更新了")}
          onMode={(mode) => action((state) => setMode(state, mode, now), "模式已切换，之后启动的任务生效")}
          onExport={() => {
            setImportText(exportSave(game));
            setToast("存档 JSON 已放入文本框");
          }}
          onImportText={setImportText}
          onImport={handleImport}
          onReset={() => {
            if (!resetArmed) {
              setResetArmed(true);
              return;
            }
            setGame(createNewGame(now, game.settings.mode));
            setResetArmed(false);
            setSettingsOpen(false);
            setToast("已经重置");
          }}
        />
      )}

      {selectedPostcard && (
        <PostcardModal postcardId={selectedPostcard} game={game} onClose={() => setSelectedPostcard(null)} />
      )}

      {rewardModal && <RewardModal entry={rewardModal} onClose={() => setRewardModal(null)} />}
    </div>
  );
}

function NavButton({
  active,
  label,
  icon,
  onClick
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" className={active ? "active" : ""} onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function BagView({
  game,
  now,
  journeyPhase,
  onBag,
  onStart,
  onClaim
}: {
  game: GameState;
  now: number;
  journeyPhase: ReturnType<typeof getJourneyPhase>;
  onBag: (foodId: FoodId | null) => void;
  onStart: () => void;
  onClaim: () => void;
}) {
  const canTravel = !game.currentJourney;
  return (
    <div className="view-stack">
      <section className="panel">
        <div className="section-title">
          <h2>行囊</h2>
          <span>{game.bag.foodId ? RECIPES[game.bag.foodId].name : "未放入食物"}</span>
        </div>
        <div className="food-grid">
          {(Object.keys(RECIPES) as FoodId[]).map((foodId) => {
            const unlocked = game.unlocked.recipes.includes(foodId);
            const count = game.inventory.foods[foodId];
            return (
              <button
                type="button"
                className={`food-option ${game.bag.foodId === foodId ? "selected" : ""}`}
                key={foodId}
                disabled={!unlocked || count <= 0 || !canTravel}
                onClick={() => onBag(foodId)}
              >
                <FoodArt foodId={foodId} />
                <strong>{RECIPES[foodId].name}</strong>
                <span>{unlocked ? `库存 ${count}` : "未解锁"}</span>
              </button>
            );
          })}
        </div>
        <div className="row">
          <button type="button" className="secondary" disabled={!game.bag.foodId || !canTravel} onClick={() => onBag(null)}>
            移除
          </button>
          {journeyPhase.kind === "returned" ? (
            <button type="button" onClick={onClaim}>
              领取归来奖励
            </button>
          ) : (
            <button type="button" disabled={!game.bag.foodId || !canTravel} onClick={onStart}>
              确认出发
            </button>
          )}
        </div>
      </section>

      {game.currentJourney && (
        <section className="panel travel-card">
          <div className="section-title">
            <h2>{DESTINATIONS[game.currentJourney.destinationId].name}</h2>
            <span>{formatDate(game.currentJourney.startedAt)}</span>
          </div>
          <p>{TRAVEL_EVENTS.find((event) => event.id === game.currentJourney?.eventId)?.text}</p>
          <Progress value={journeyPhase.progress} />
        </section>
      )}

      <section className="panel destinations">
        <div className="section-title">
          <h2>目的地</h2>
          <span>食物会影响路线权重</span>
        </div>
        {Object.values(DESTINATIONS).map((destination) => (
          <div className="destination-row" key={destination.id}>
            <Map size={18} />
            <div>
              <strong>{destination.name}</strong>
              <span>{game.unlocked.destinations.includes(destination.id) ? destination.description : "尚未解锁"}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function PlotModal({ game, now, plotId, onClose, onPlant, onHarvest }: {
  game: GameState; now: number; plotId: string; onClose: () => void;
  onPlant: (id: string, cropId: CropId) => void; onHarvest: (id: string) => void;
}) {
  const plot = game.plots.find((item) => item.id === plotId);
  if (!plot) return null;
  const phase = getCropPhase(plot, now);
  const seeds = (Object.keys(CROPS) as CropId[]).filter((id) => game.unlocked.crops.includes(id) && game.inventory.seeds[id] > 0);
  return <Modal title={plot.cropId ? CROPS[plot.cropId].name + "的生长" : "种点什么呢"} onClose={onClose}>
    {plot.cropId ? <div className="growth-detail">
      <CropArt cropId={plot.cropId} stage={phase.kind === "ready" ? "ready" : "growing"} />
      <Progress value={phase.progress} />
      <p>{phase.kind === "ready" ? "已经成熟，可以收获了" : "还需 " + formatTime(phase.remainingMs) + " · " + Math.floor(phase.progress * 100) + "%"}</p>
      <button disabled={phase.kind !== "ready"} onClick={() => onHarvest(plot.id)}>收获作物</button>
    </div> : <div className="seed-list">
      <p className="hint">选一包种子，种在这块空地里。</p>
      {seeds.length === 0 && <div className="empty-state"><h3>暂时没有可用种子</h3><p>收获其他成熟作物或领取旅行奖励，可以带回新的种子。</p></div>}
      {seeds.map((id) => <button key={id} onClick={() => onPlant(plotId, id)}><CropArt cropId={id} stage="seed" /><div><strong>{CROPS[id].seedName}</strong><span>拥有 {game.inventory.seeds[id]} · {formatTime(getCropDuration(id, game.settings.mode))}成熟</span></div></button>)}
    </div>}
  </Modal>;
}

function KitchenView({
  game,
  now,
  cookingPhase,
  onCook,
  onClaim
}: {
  game: GameState;
  now: number;
  cookingPhase: ReturnType<typeof getCookingPhase>;
  onCook: (recipeId: FoodId) => void;
  onClaim: () => void;
}) {
  return (
    <div className="view-stack">
      <section className="panel cooking-slot">
        <div className="section-title">
          <h2>烹饪槽</h2>
          <span>{game.cooking ? RECIPES[game.cooking.recipeId].name : "空闲"}</span>
        </div>
        {game.cooking ? (
          <>
            <FoodArt foodId={game.cooking.recipeId} />
            <Progress value={cookingPhase.progress} />
            <p>{cookingPhase.kind === "ready" ? "香味已经飘出来了" : `还需要 ${formatTime(cookingPhase.remainingMs)}`}</p>
            <button type="button" disabled={cookingPhase.kind !== "ready"} onClick={onClaim}>
              领取食物
            </button>
          </>
        ) : (
          <p>一次只能制作一份食物。开始时扣除材料，完成后领取。</p>
        )}
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>食谱</h2>
          <span>当前时间 {formatDate(now)}</span>
        </div>
        <div className="recipe-list">
          {(Object.keys(RECIPES) as FoodId[]).map((recipeId) => {
            const recipe = RECIPES[recipeId];
            const unlocked = game.unlocked.recipes.includes(recipeId);
            const missing = getMissingIngredients(game, recipeId);
            return (
              <article className={`recipe ${unlocked ? "" : "locked"}`} key={recipeId}>
                <FoodArt foodId={recipeId} />
                <div>
                  <h3>{recipe.name}</h3>
                  <p>{recipe.effect}</p>
                  <span>
                    需要{" "}
                    {Object.entries(recipe.ingredients)
                      .map(([cropId, amount]) => `${CROPS[cropId as CropId].materialName} ${amount}`)
                      .join(" + ")}
                  </span>
                  {unlocked && missing.length > 0 && (
                    <em>
                      缺少{" "}
                      {missing.map((item) => `${CROPS[item.cropId].materialName} ${item.needed - item.owned}`).join("、")}
                    </em>
                  )}
                  {!unlocked && <em>旅行中可能带回这个食谱</em>}
                </div>
                <button type="button" disabled={!unlocked || missing.length > 0 || Boolean(game.cooking)} onClick={() => onCook(recipeId)}>
                  制作
                </button>
              </article>
            );
          })}
        </div>
      </section>


    </div>
  );
}

function AlbumView({
  game,
  collectedIds,
  onOpen
}: {
  game: GameState;
  collectedIds: Set<PostcardId>;
  onOpen: (postcardId: PostcardId) => void;
}) {
  return (
    <div className="view-stack">
      <section className="panel">
        <div className="section-title">
          <h2>明信片</h2>
          <span>{game.album.collected.length}/9</span>
        </div>
        <div className="postcard-grid">
          {(Object.keys(POSTCARDS) as PostcardId[]).map((postcardId) => {
            const collected = collectedIds.has(postcardId);
            return (
              <button type="button" className="postcard-tile" key={postcardId} disabled={!collected} onClick={() => onOpen(postcardId)}>
                <PostcardArt postcardId={postcardId} locked={!collected} />
                <strong>{collected ? POSTCARDS[postcardId].title : "未获得"}</strong>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>旅行日志</h2>
          <span>{game.travelLog.length}次旅行</span>
        </div>
        <div className="log-list">
          {game.travelLog.length === 0 && <p>还没有旅行记录。给行囊放一份食物，让小鸟出发吧。</p>}
          {game.travelLog.map((entry) => (
            <article className="log-entry" key={entry.journeyId}>
              <div className="section-title">
                <h3>{DESTINATIONS[entry.destinationId].name}</h3>
                <span>{formatDate(entry.date)}</span>
              </div>
              <p>
                带着{RECIPES[entry.foodId].name}，收到了《{POSTCARDS[entry.postcardId].title}》。
              </p>
              <em>{rewardText(entry)}</em>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function InventoryPanel({ game }: { game: GameState }) {
  return (
    <section className="panel inventory">
      <div className="section-title">
        <h2>库存</h2>
        <span>种子 · 原料 · 食物</span>
      </div>
      <div className="inventory-grid">
        {(Object.keys(CROPS) as CropId[]).map((cropId) => (
          <div key={`seed-${cropId}`}>
            <CropArt cropId={cropId} stage="seed" /><strong>{CROPS[cropId].seedName}</strong>
            <span>{game.inventory.seeds[cropId]}</span>
          </div>
        ))}
        {(Object.keys(CROPS) as CropId[]).map((cropId) => (
          <div key={`material-${cropId}`}>
            <CropArt cropId={cropId} stage="ready" /><strong>{CROPS[cropId].materialName}</strong>
            <span>{game.inventory.materials[cropId]}</span>
          </div>
        ))}
        {(Object.keys(RECIPES) as FoodId[]).map((foodId) => (
          <div key={`food-${foodId}`}>
            <FoodArt foodId={foodId} /><strong>{RECIPES[foodId].name}</strong>
            <span>{game.inventory.foods[foodId]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="progress" aria-label={`进度 ${Math.round(value * 100)}%`}>
      <span style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

function IntroModal({ onChoose }: { onChoose: (mode: Mode) => void }) {
  return (
    <div className="modal-backdrop">
      <section className="modal intro">
        <BirdArt />
        <h2>欢迎来到《旅行小鸟》</h2>
        <p>先用小麦做一份旅行面包，放进行囊，小鸟就会带回第一张明信片和新的种子。</p>
        <div className="mode-grid">
          <button type="button" className="primary-choice" onClick={() => onChoose("demo")}>
            <strong>快速试玩</strong>
            <span>作物5秒，烹饪3秒，旅行15秒</span>
          </button>
          <button type="button" className="secondary" onClick={() => onChoose("normal")}>
            <strong>悠闲体验</strong>
            <span>使用正常放置时长</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function SettingsModal({
  game,
  importText,
  resetArmed,
  onClose,
  onRename,
  onMode,
  onExport,
  onImportText,
  onImport,
  onReset
}: {
  game: GameState;
  importText: string;
  resetArmed: boolean;
  onClose: () => void;
  onRename: (name: string) => void;
  onMode: (mode: Mode) => void;
  onExport: () => void;
  onImportText: (value: string) => void;
  onImport: () => void;
  onReset: () => void;
}) {
  const [name, setName] = useState(game.bird.name);
  return (
    <Modal title="设置" onClose={onClose}>
      <div className="settings-modal">
        <label>
          小鸟名字
          <div className="inline-form">
            <input value={name} maxLength={8} onChange={(event) => setName(event.target.value)} />
            <button type="button" onClick={() => onRename(name)}>
              保存
            </button>
          </div>
        </label>
        <div>
          <strong>演示模式</strong>
          <div className="segmented">
            <button type="button" className={game.settings.mode === "demo" ? "active" : ""} onClick={() => onMode("demo")}>
              快速试玩
            </button>
            <button type="button" className={game.settings.mode === "normal" ? "active" : ""} onClick={() => onMode("normal")}>
              悠闲体验
            </button>
          </div>
          <p className="hint">切换只影响之后启动的种植、烹饪和旅行，已开始任务保持原结束时间。</p>
        </div>
        <div className="save-tools">
          <div className="row">
            <button type="button" className="secondary" onClick={onExport}>
              <Download size={18} /> 导出
            </button>
            <button type="button" onClick={onImport}>
              <Upload size={18} /> 导入
            </button>
          </div>
          <textarea
            value={importText}
            onChange={(event) => onImportText(event.target.value)}
            placeholder="在这里粘贴导出的 JSON 存档"
            rows={6}
          />
          <p className="hint">进度仅保存在当前浏览器；清除网站数据或更换设备不会保留，建议定期导出备份。</p>
        </div>
        <button type="button" className="danger" onClick={onReset}>
          <RotateCcw size={18} /> {resetArmed ? "再次点击确认重置" : "重置游戏"}
        </button>
      </div>
    </Modal>
  );
}

function PostcardModal({ postcardId, game, onClose }: { postcardId: PostcardId; game: GameState; onClose: () => void }) {
  const entry = game.album.collected.find((item) => item.postcardId === postcardId);
  if (!entry) return null;
  return (
    <Modal title="明信片" onClose={onClose}>
      <section className="postcard-modal">
        <PostcardArt postcardId={postcardId} />
        <h2>{POSTCARDS[postcardId].title}</h2>
        <p>{entry.firstStory}</p>
        <em>首次获得：{formatDate(entry.firstCollectedAt)}</em>
        <button type="button" onClick={onClose}>
          收好
        </button>
      </section>
    </Modal>
  );
}

function RewardModal({ entry, onClose }: { entry: TravelLogEntry; onClose: () => void }) {
  return (
    <Modal title="小鸟回来了" onClose={onClose}>
      <section className="reward-modal">
        <PostcardArt postcardId={entry.postcardId} />
        <h2>小鸟回来了</h2>
        <p>{entry.story}</p>
        <strong>奖励：{rewardText(entry)}</strong>
        <button type="button" onClick={onClose}>
          收下
        </button>
      </section>
    </Modal>
  );
}
