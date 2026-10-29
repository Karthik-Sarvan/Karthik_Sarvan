import { useCallback, useEffect, useRef, useState } from "react";
import { RideAudio } from "./audio/RideAudio";
import { EASTER_EGGS, LINKS, OWNER, STOPS, type Stop } from "./data/places";
import { createEngine, type EngineAPI, type Phase, type RideInput, type RideState } from "./world/engine";

interface Toast {
  key: number;
  kicker: string;
  label: string;
  note: string;
}

const DRIVE_KEYS = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight", "Space",
]);

function Joystick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const pointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const move = (event: React.PointerEvent) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    let dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    let dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      dx /= length;
      dy /= length;
    }
    setKnob({ x: dx, y: dy });
    onChange(Math.abs(dx) < 0.12 ? 0 : dx, Math.abs(dy) < 0.12 ? 0 : dy);
  };
  const end = () => {
    pointer.current = null;
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  };

  return (
    <div
      ref={baseRef}
      className="joystick"
      role="application"
      aria-label="Ride joystick: push up to pedal, sideways to steer, down to brake"
      onPointerDown={(event) => {
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={(event) => pointer.current === event.pointerId && move(event)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <span className="joystick-ring" aria-hidden="true" />
      <div className="joystick-knob" style={{ transform: `translate(${knob.x * 36}px, ${knob.y * 36}px)` }} />
    </div>
  );
}

function StopPanel({
  stop,
  index,
  onClose,
  onNext,
}: {
  stop: Stop;
  index: number;
  onClose: () => void;
  onNext: (() => void) | null;
}) {
  return (
    <aside className="stop-panel" role="dialog" aria-labelledby={`stop-${stop.id}`}>
      <div className="stop-grab" aria-hidden="true" />
      <div className="stop-head">
        <span className="mono">{stop.kicker}</span>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <p className="stop-place mono">
        Stop {String(index + 1).padStart(2, "0")} — {stop.place}
      </p>
      <h2 id={`stop-${stop.id}`}>{stop.title}</h2>
      <p className="stop-lede">{stop.lede}</p>
      {stop.body.map((paragraph) => (
        <p key={paragraph.slice(0, 24)} className="stop-body">
          {paragraph}
        </p>
      ))}
      <div className="stop-tags">
        {stop.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <div className="stop-links">
        {stop.links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            {...(link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {link.label} <span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
      {onNext && (
        <button type="button" className="next-btn" onClick={onNext}>
          Ride to the next stop →
        </button>
      )}
    </aside>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [leaving, setLeaving] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [openStop, setOpenStop] = useState<number | null>(null);
  const [indexOpen, setIndexOpen] = useState(false);
  const [state, setState] = useState<RideState>({
    speed: 0,
    visited: [],
    nextIndex: 0,
    nextName: STOPS[0].place,
    bearing: 0,
    distance: 0,
    district: "Bazaar Road",
    districtSub: "shutters & awnings",
    eggs: 0,
    eggTotal: EASTER_EGGS.length,
    night: 1,
    clock: "22:30",
  });

  const stageRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<EngineAPI | null>(null);
  const audioRef = useRef<RideAudio | null>(null);
  const pressed = useRef<Set<string>>(new Set());
  const phaseRef = useRef(phase);
  const toastId = useRef(0);
  phaseRef.current = phase;

  const pushToast = useCallback((kicker: string, label: string, note: string) => {
    const key = ++toastId.current;
    setToasts((prev) => [...prev.slice(-1), { key, kicker, label, note }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.key !== key)), 3800);
  }, []);

  const getAudio = useCallback(() => {
    if (!audioRef.current) audioRef.current = new RideAudio();
    return audioRef.current;
  }, []);

  useEffect(() => {
    const container = stageRef.current;
    if (!container) return;
    let mounted = true;
    const result = createEngine(container, {
      onReady: () => mounted && setReady(true),
      onError: (message) => {
        if (!mounted) return;
        setError((prev) => prev ?? message);
        setReady(true);
      },
      onState: (next) => {
        if (!mounted) return;
        setState(next);
        const audio = audioRef.current;
        if (audio && !audio.isMuted) audio.setSpeed(Math.min(1, next.speed / 55));
      },
      onPhase: (next) => mounted && setPhase(next),
      onStop: (index) => {
        audioRef.current?.chime(false);
        setOpenStop(index);
      },
      onLeaveStop: (index) => setOpenStop((current) => (current === index ? null : current)),
      onEgg: (name, note, found, total) => {
        audioRef.current?.chime(true);
        pushToast(`Hidden note ${found} / ${total}`, name, note);
      },
      onBell: () => audioRef.current?.bell(),
    });
    apiRef.current = result.api;
    return () => {
      mounted = false;
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [pushToast]);

  useEffect(() => () => audioRef.current?.dispose(), []);

  const setInput = useCallback((next: Partial<RideInput>) => apiRef.current?.setInput(next), []);

  const handlePlay = useCallback(async () => {
    if (phaseRef.current !== "idle") return;
    const audio = getAudio();
    await audio.unlock();
    await audio.setMuted(false);
    setSoundOn(true);
    setLeaving(true);
    setIndexOpen(false);
    setOpenStop(null);
    apiRef.current?.start();
    window.setTimeout(() => setLeaving(false), 1000);
  }, [getAudio]);

  const toggleSound = useCallback(async () => {
    const audio = getAudio();
    if (audio.isMuted) {
      await audio.unlock();
      await audio.setMuted(false);
      setSoundOn(true);
    } else {
      await audio.setMuted(true);
      setSoundOn(false);
    }
  }, [getAudio]);

  const goToStop = useCallback(
    (index: number) => {
      apiRef.current?.teleport(index);
      setIndexOpen(false);
      setOpenStop(null);
      if (phaseRef.current === "idle") void handlePlay();
    },
    [handlePlay],
  );

  const toggleTime = useCallback(() => {
    apiRef.current?.setTimeMode(state.night > 0.5 ? "day" : "night");
  }, [state.night]);

  useEffect(() => {
    const apply = () => {
      const keys = pressed.current;
      setInput({
        throttle: keys.has("KeyW") || keys.has("ArrowUp"),
        brake: keys.has("KeyS") || keys.has("ArrowDown") || keys.has("Space"),
        left: keys.has("KeyA") || keys.has("ArrowLeft"),
        right: keys.has("KeyD") || keys.has("ArrowRight"),
        sprint: keys.has("ShiftLeft") || keys.has("ShiftRight"),
      });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === "Escape") {
        setOpenStop(null);
        setIndexOpen(false);
        return;
      }
      if (event.code === "Enter" && phaseRef.current === "idle") return void handlePlay();
      if (event.code === "KeyB") return apiRef.current?.ringBell();
      if (event.code === "KeyR") return apiRef.current?.reset();
      if (event.code === "KeyM") return void toggleSound();
      if (event.code === "KeyI") return setIndexOpen((open) => !open);
      if (event.code === "KeyN") return toggleTime();
      if (DRIVE_KEYS.has(event.code)) {
        event.preventDefault();
        pressed.current.add(event.code);
        apply();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (pressed.current.delete(event.code)) apply();
    };
    const onBlur = () => {
      pressed.current.clear();
      apply();
    };
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [handlePlay, setInput, toggleSound, toggleTime]);

  const riding = phase === "ride" && !error;
  const isNight = state.night > 0.5;
  const nextUnvisitedAfter = (index: number) => {
    for (let step = 1; step <= STOPS.length; step++) {
      const candidate = (index + step) % STOPS.length;
      if (!state.visited.includes(candidate)) return candidate;
    }
    return (index + 1) % STOPS.length;
  };

  return (
    <>
      <div className="stage" ref={stageRef} />
      <div className="vignette" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <div className={`letterbox ${phase === "intro" ? "on" : ""}`} aria-hidden="true">
        <i />
        <i />
      </div>

      {!ready && !error && (
        <div className="loader">
          <div className="fold-mark" aria-hidden="true" />
          <div className="loader-bar" aria-hidden="true">
            <i />
          </div>
          <span>folding the city</span>
        </div>
      )}

      {error && (
        <div className="fallback">
          <h2>{OWNER.name}</h2>
          <p>
            This portfolio is a 3D ride that needs WebGL, which looks blocked in this browser. The
            work itself is a click away:
          </p>
          <div className="stop-links center">
            <a href={LINKS.gitlab} target="_blank" rel="noopener noreferrer">GitLab ↗</a>
            <a href={LINKS.github} target="_blank" rel="noopener noreferrer">GitHub ↗</a>
            <a href={LINKS.mimic} target="_blank" rel="noopener noreferrer">Mimic ↗</a>
            <a href={LINKS.email}>Email ↗</a>
          </div>
          <p className="mono">{error}</p>
        </div>
      )}

      {phase === "idle" && ready && !error && (
        <div className={`title-screen ${leaving ? "leaving" : ""}`}>
          <div className="title-top">
            <span>Portfolio · 2026</span>
            <span className="hide-sm">A ride through the work</span>
          </div>
          <div className="title-mid">
            <p className="title-eyebrow">{OWNER.role}</p>
            <h1>
              Karthik
              <br />
              <b>Sarvan</b>
            </h1>
            <p className="title-lede">
              A folded paper city at night. Drop through the clouds onto an old roadster and ride
              to six lit stops — each one a piece of the work, from Mesa drivers to kernel display
              paths to firmware testing.
            </p>
          </div>
          <div className="title-bottom">
            <div className="title-actions">
              <button type="button" className="play-button" onClick={() => void handlePlay()}>
                <span className="glyph" aria-hidden="true">▶</span>
                Start the ride
              </button>
              <button type="button" className="ghost-button" onClick={() => setIndexOpen(true)}>
                Browse the work
              </button>
            </div>
            <button
              type="button"
              className={`pill ${soundOn ? "on" : ""}`}
              onClick={() => void toggleSound()}
              aria-pressed={soundOn}
            >
              <i aria-hidden="true" />
              {soundOn ? "Sound on" : "Sound off"}
            </button>
          </div>
        </div>
      )}

      {riding && (
        <div className="hud">
          <div className="hud-corner">
            <div className="hud-name">{OWNER.name}</div>
            <div className="hud-district">
              {state.district} <span>· {state.districtSub}</span>
            </div>
          </div>

          <div className="hud-right">
            <button type="button" className="pill" onClick={() => setIndexOpen(true)}>
              <span className="pill-count mono">{state.visited.length}/{STOPS.length}</span>
              Stops
            </button>
            <button type="button" className="pill" onClick={toggleTime} aria-label="Toggle day and night">
              <span aria-hidden="true">{isNight ? "☾" : "☀"}</span>
              <span className="mono">{state.clock}</span>
            </button>
            <button
              type="button"
              className={`pill icon ${soundOn ? "on" : ""}`}
              onClick={() => void toggleSound()}
              aria-pressed={soundOn}
              aria-label={soundOn ? "Mute" : "Unmute"}
            >
              <i aria-hidden="true" />
            </button>
          </div>

          {state.nextIndex !== -1 && openStop === null && (
            <div className="hud-compass">
              <div className="compass-dial">
                <div
                  className="compass-needle"
                  style={{ transform: `translate(-50%, -100%) rotate(${(-state.bearing * 180) / Math.PI}deg)` }}
                />
              </div>
              <div className="compass-label">
                {STOPS[state.nextIndex].kicker.split("· ")[1]} · {state.nextName}
              </div>
              <div className="compass-dist mono">{Math.round(state.distance)} m</div>
            </div>
          )}

          <div className="hud-keys">
            <div><b>W A S D</b>ride</div>
            <div><b>Shift</b>faster · <b>B</b>bell</div>
            <div><b>I</b>stops · <b>N</b>day/night</div>
          </div>

          <div className="toast-rail">
            {toasts.map((toast) => (
              <div className="toast" key={toast.key}>
                <div className="kicker">{toast.kicker}</div>
                <div className="label">{toast.label}</div>
                <div className="note">{toast.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {riding && (
        <div className="touch-controls">
          <Joystick onChange={(x, y) => setInput({ axisX: x, axisY: y })} />
          <button type="button" className="bell-btn" onClick={() => apiRef.current?.ringBell()} aria-label="Ring bell">
            🔔
          </button>
        </div>
      )}

      {openStop !== null && (
        <StopPanel
          stop={STOPS[openStop]}
          index={openStop}
          onClose={() => setOpenStop(null)}
          onNext={riding ? () => goToStop(nextUnvisitedAfter(openStop)) : null}
        />
      )}

      {indexOpen && (
        <div className="index-overlay" role="dialog" aria-label="All stops" onClick={() => setIndexOpen(false)}>
          <div className="index-panel" onClick={(event) => event.stopPropagation()}>
            <div className="stop-head">
              <span className="mono">The work · {STOPS.length} stops</span>
              <button type="button" className="icon-btn" onClick={() => setIndexOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <ol className="index-list">
              {STOPS.map((stop, index) => (
                <li key={stop.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (phaseRef.current === "idle") {
                        setIndexOpen(false);
                        setOpenStop(index);
                      } else goToStop(index);
                    }}
                  >
                    <span className="index-num mono">{String(index + 1).padStart(2, "0")}</span>
                    <span className="index-text">
                      <b>{stop.title}</b>
                      <span>{stop.kicker.split("· ")[1]} · {stop.place}</span>
                    </span>
                    <span className="index-mark" aria-hidden="true">
                      {state.visited.includes(index) ? "✓" : "→"}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
            <p className="index-foot mono">
              {phase === "idle" ? "Select to read · or start the ride" : "Select to ride there"} ·{" "}
              {state.eggs}/{state.eggTotal} hidden notes found
            </p>
          </div>
        </div>
      )}
    </>
  );
}
