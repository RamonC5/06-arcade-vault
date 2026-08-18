'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import SkinPicker from '@/components/SkinPicker';
import { getSavedSkin, saveSkin } from '@/lib/skins';
import TouchControls from '@/components/TouchControls';
import {
  useCoarsePointer,
  type GameInput,
  type TouchLayout,
} from '@/lib/gameInput';
import { useFullscreen } from '@/lib/useFullscreen';

const SnakeGame = dynamic(() => import('@/components/games/SnakeGame'), {
  ssr: false,
});

const GAME_ID = 'snake';
const SKIN_OPTIONS = ['clasico', 'retro', 'neon'];

const TOUCH_LAYOUT: TouchLayout = {
  dpad: [
    { action: 'up', label: '▲', mode: 'tap' },
    { action: 'left', label: '◀', mode: 'tap' },
    { action: 'down', label: '▼', mode: 'tap' },
    { action: 'right', label: '▶', mode: 'tap' },
  ],
  actions: [],
};

const CRT_STYLE = { '--crt-ratio': '1 / 1' } as CSSProperties;

export default function SnakePlay() {
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState('INVITADO');
  const [saved, setSaved] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [skinKey, setSkinKey] = useState('clasico');
  const inputRef = useRef<GameInput | null>(null);
  const coarsePointer = useCoarsePointer();
  const { ref: stageRef, active: fsActive, toggle: toggleFs } = useFullscreen();
  // Mirrors `fsActive` so `handleGameOver` can read it without depending on
  // it — that callback's identity must stay stable across renders.
  const fsActiveRef = useRef(fsActive);
  useEffect(() => {
    fsActiveRef.current = fsActive;
  }, [fsActive]);

  // Read the stored skin after mount, never in the useState initializer, so the
  // first client render matches the server HTML.
  useEffect(() => {
    setSkinKey(getSavedSkin(GAME_ID));
  }, []);

  const handleScoreChange = useCallback((s: number) => setScore(s), []);
  const handleLevelChange = useCallback((l: number) => setLevel(l), []);
  const handleLivesChange = useCallback((l: number) => setLives(l), []);
  const handleGameOver = useCallback(
    (finalScore: number) => {
      setScore(finalScore);
      setOver(true);
      // The game-over modal renders outside the fullscreen element, so leave
      // fullscreen first or it would stay invisible behind it.
      if (fsActiveRef.current) toggleFs();
    },
    [toggleFs],
  );

  useEffect(() => {
    if (over) {
      const saved = localStorage.getItem('av_player_name');
      if (saved) setName(saved);
    }
  }, [over]);

  function changeSkin(key: string) {
    setSkinKey(key);
    saveSkin(GAME_ID, key);
  }

  function restart() {
    setScore(0);
    setLevel(1);
    setLives(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setName('INVITADO');
    setGameKey((k) => k + 1);
  }

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: 'var(--ink)' }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString('es-ES')}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{lives > 0 ? '♥' : '—'}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, '0')}</div>
          </div>
          <SkinPicker
            value={skinKey}
            options={SKIN_OPTIONS}
            onChange={changeSkin}
          />
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? 'REANUDAR' : 'PAUSA'}
          </button>
          <button className="btn cyan" onClick={toggleFs}>
            {fsActive ? 'SALIR PANTALLA COMPLETA' : 'PANTALLA COMPLETA'}
          </button>
          <button className="btn magenta" onClick={() => setOver(true)}>
            FIN
          </button>
          <Link href="/games/snake" className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div
        ref={stageRef}
        className={`av-stage${fsActive ? ' av-stage-fs' : ''}`}
      >
        <div className="crt" style={CRT_STYLE}>
          <div className="crt-screen">
            <SnakeGame
              key={gameKey}
              paused={paused}
              skinKey={skinKey}
              onScoreChange={handleScoreChange}
              onLevelChange={handleLevelChange}
              onLivesChange={handleLivesChange}
              onGameOver={handleGameOver}
              inputRef={inputRef}
            />
            {paused && (
              <div
                className="crt-content"
                style={{ background: 'rgba(0,0,0,0.6)', zIndex: 5 }}
              >
                <div>
                  <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                    EN PAUSA
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 11,
                      color: 'var(--ink-dim)',
                      marginTop: 10,
                      letterSpacing: '0.16em',
                    }}
                  >
                    PULSA REANUDAR PARA CONTINUAR
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="crt-bottom">
            <span className="led">SEÑAL OK</span>
            <span>SNAKE · CRT-83 · 60 HZ</span>
            <span>CARGA · 1MB</span>
          </div>
        </div>

        {coarsePointer && (
          <TouchControls
            layout={TOUCH_LAYOUT}
            inputRef={inputRef}
            disabled={paused || over}
          />
        )}
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString('es-ES')}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={async () => {
                    setSaved(true);
                    localStorage.setItem('av_player_name', name);
                    const supabase = createClient();
                    await supabase.from('scores').insert({
                      game_id: 'snake',
                      player_name: name,
                      score,
                      user_id: null,
                    });
                  }}
                >
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games/snake#leaderboard" className="btn cyan">
                VER LEADERBOARD
              </Link>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
