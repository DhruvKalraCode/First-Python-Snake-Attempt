declare const THREE: any;

type WeaponType = 'AR' | 'Shotgun';
type GameScreen = 'title' | 'settings' | 'levelSelect' | 'loadout' | 'playing' | 'result';

interface LevelDefinition {
  id: number;
  name: string;
  dimension: 1 | 2 | 3 | 4 | 5;
  description: string;
  backdrop: string;
}

interface Entity {
  pos: number[];
  hp: number;
  cooldown: number;
}

const LEVELS: LevelDefinition[] = [
  { id: 1, name: 'L1 - Linear Breach', dimension: 1, description: 'Corridor duel on x axis only.', backdrop: '#132035' },
  { id: 2, name: 'L2 - Planar Cut', dimension: 2, description: 'True x,y combat with corners and flanks.', backdrop: '#092d2f' },
  { id: 3, name: 'L3 - Arena Volume', dimension: 3, description: 'Classic first-person style movement translated to projection.', backdrop: '#2c0f35' },
  { id: 4, name: 'L4 - W-Shift Gauntlet', dimension: 4, description: 'x,y,z,w with explicit W+/W- movement.', backdrop: '#36210a' },
  { id: 5, name: 'L5 - V-Phase Singularity', dimension: 5, description: 'x,y,z,w,v with consistent adjacency.', backdrop: '#300d1f' }
];

const WEAPONS = {
  AR: { damage: 8, cooldown: 0.12, range: 22, spread: 0.08 },
  Shotgun: { damage: 6, cooldown: 0.85, range: 14, spread: 0.44 }
};

class DimensionalMath {
  static zeros(d: number): number[] { return Array.from({ length: d }, () => 0); }
  static dist(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
  }
  static move(pos: number[], axis: number, dir: number, speed: number): number[] {
    const n = [...pos];
    n[axis] += dir * speed;
    return n;
  }
}

class Projection {
  static to3D(v: number[]): [number, number, number] {
    const x = v[0] ?? 0;
    const y = v[1] ?? 0;
    const z = v[2] ?? 0;
    const w = v[3] ?? 0;
    const q = v[4] ?? 0;
    return [x + 0.45 * w - 0.28 * q, y + 0.25 * q, z + 0.35 * w];
  }
}

class DuelGame {
  private screen: GameScreen = 'title';
  private selectedLevel: LevelDefinition = LEVELS[0];
  private playerWeapon: WeaponType = 'AR';
  private rivalWeapon: WeaponType = 'Shotgun';
  private app: HTMLElement;
  private scene: any;
  private camera: any;
  private renderer: any;
  private playerMesh: any;
  private rivalMesh: any;
  private drones: any[] = [];
  private stars: any[] = [];
  private input = new Set<string>();
  private player: Entity = { pos: [0], hp: 100, cooldown: 0 };
  private rival: Entity = { pos: [6], hp: 100, cooldown: 0 };
  private wave = 1;
  private resultText = '';
  private unlocked = 1;
  private sensitivity = 1;

  constructor() {
    this.app = document.getElementById('app')!;
    this.unlocked = Number(localStorage.getItem('dd_unlocked') || '1');
    this.sensitivity = Number(localStorage.getItem('dd_sens') || '1');
    window.addEventListener('keydown', (e) => this.input.add(e.key.toLowerCase()));
    window.addEventListener('keyup', (e) => this.input.delete(e.key.toLowerCase()));
    this.renderUI();
    this.loop();
  }

  private renderUI() {
    const header = `<h1>DIMENSIONAL DUEL</h1><p class='sub'>Severe Sci-Fi Dimensional Combat Simulation</p>`;
    if (this.screen === 'title') {
      this.app.innerHTML = `<div class='panel'>${header}<button id='play'>Start Simulation</button><button id='settings'>Settings</button></div>`;
      this.bind('play', () => { this.screen = 'levelSelect'; this.renderUI(); });
      this.bind('settings', () => { this.screen = 'settings'; this.renderUI(); });
    } else if (this.screen === 'settings') {
      this.app.innerHTML = `<div class='panel'>${header}<h2>Settings</h2><label>Look Sensitivity <input id='sens' type='range' min='0.4' max='2' step='0.1' value='${this.sensitivity}' /></label><button id='back'>Back</button></div>`;
      (document.getElementById('sens') as HTMLInputElement).oninput = (e) => {
        this.sensitivity = Number((e.target as HTMLInputElement).value);
        localStorage.setItem('dd_sens', String(this.sensitivity));
      };
      this.bind('back', () => { this.screen = 'title'; this.renderUI(); });
    } else if (this.screen === 'levelSelect') {
      this.app.innerHTML = `<div class='panel'>${header}<h2>Level Select</h2>${LEVELS.map(l => `<button ${l.id > this.unlocked ? 'disabled' : ''} id='lvl${l.id}'>${l.name}</button>`).join('')}<button id='back'>Back</button></div>`;
      LEVELS.forEach(l => this.bind(`lvl${l.id}`, () => { this.selectedLevel = l; this.screen = 'loadout'; this.renderUI(); }));
      this.bind('back', () => { this.screen = 'title'; this.renderUI(); });
    } else if (this.screen === 'loadout') {
      this.rivalWeapon = Math.random() > 0.5 ? 'AR' : 'Shotgun';
      this.app.innerHTML = `<div class='panel'>${header}<h2>${this.selectedLevel.name} Loadout</h2><p>${this.selectedLevel.description}</p><div class='row'><button id='ar'>AR</button><button id='shotgun'>Shotgun</button></div><p>Rival AI carries: <b>${this.rivalWeapon}</b></p><button id='launch'>Launch</button></div>`;
      this.bind('ar', () => this.playerWeapon = 'AR');
      this.bind('shotgun', () => this.playerWeapon = 'Shotgun');
      this.bind('launch', () => this.startLevel());
    } else if (this.screen === 'result') {
      this.app.innerHTML = `<div class='panel'>${header}<h2>${this.resultText}</h2><button id='retry'>Restart Level</button><button id='levels'>Level Select</button></div>`;
      this.bind('retry', () => this.startLevel());
      this.bind('levels', () => { this.screen = 'levelSelect'; this.renderUI(); });
    }
  }

  private startLevel() {
    this.screen = 'playing';
    this.wave = 1;
    this.player = { pos: DimensionalMath.zeros(this.selectedLevel.dimension), hp: 100, cooldown: 0 };
    this.rival = { pos: DimensionalMath.zeros(this.selectedLevel.dimension).map((_,i)=> i===0 ? 6 : 0), hp: 100, cooldown: 0 };
    this.setupThree();
  }

  private setupThree() {
    this.app.innerHTML = `<div id='hud'><div id='info'></div><div id='hp'></div><div id='dim'></div></div><div id='render'></div>`;
    const c = document.getElementById('render')!;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.selectedLevel.backdrop);
    this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 300);
    this.camera.position.set(0, 8, 16);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    c.appendChild(this.renderer.domElement);
    const hemi = new THREE.HemisphereLight(0xbbe2ff, 0x0a0a16, 1.6);
    const dir = new THREE.DirectionalLight(0xffffff, 1.5); dir.position.set(10, 12, 5);
    this.scene.add(hemi, dir);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 0.6, metalness: 0.4 }));
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);
    this.playerMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 18), new THREE.MeshStandardMaterial({ color: 0x4cd6ff, emissive: 0x001f2d }));
    this.rivalMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.65), new THREE.MeshStandardMaterial({ color: 0xff5677, emissive: 0x330910 }));
    this.scene.add(this.playerMesh, this.rivalMesh);
    this.drones = [];
    for (let i = 0; i < 120; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      s.position.set((Math.random()-0.5)*90, Math.random()*30+6, (Math.random()-0.5)*90); this.scene.add(s); this.stars.push(s);
    }
  }

  private loop() {
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.033);
      last = t;
      if (this.screen === 'playing') this.tickGameplay(dt);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  private tickGameplay(dt: number) {
    this.player.cooldown = Math.max(0, this.player.cooldown - dt);
    this.rival.cooldown = Math.max(0, this.rival.cooldown - dt);
    const speed = (this.input.has('shift') ? 6 : 3.2) * dt;
    const map: [string, number, number][] = [['a',0,-1],['d',0,1],['w',1,1],['s',1,-1],['q',2,-1],['e',2,1],['r',3,1],['f',3,-1],['t',4,1],['g',4,-1]];
    for (const [key, axis, dir] of map) {
      if (axis < this.selectedLevel.dimension && this.input.has(key)) this.player.pos = DimensionalMath.move(this.player.pos, axis, dir, speed * this.sensitivity);
    }
    const chaseAxis = (this.wave + Math.floor(performance.now()/1500)) % this.selectedLevel.dimension;
    const delta = this.player.pos[chaseAxis] - this.rival.pos[chaseAxis];
    this.rival.pos[chaseAxis] += Math.sign(delta) * dt * 2;
    const dist = DimensionalMath.dist(this.player.pos, this.rival.pos);
    this.tryShoot(this.player, this.rival, this.playerWeapon, dist, this.input.has(' '));
    this.tryShoot(this.rival, this.player, this.rivalWeapon, dist, dist < 17);
    if (this.drones.length < this.wave + 1) this.spawnDrone();
    this.drones.forEach((d) => {
      const axis = Math.floor(Math.random() * this.selectedLevel.dimension);
      d.userData.pos[axis] += (Math.random() - 0.5) * dt * 2;
      const dd = DimensionalMath.dist(d.userData.pos, this.player.pos);
      if (dd < 10 && Math.random() < dt * 0.8) this.player.hp -= 2;
      const [x, y, z] = Projection.to3D(d.userData.pos); d.position.set(x, y + 0.5, z);
    });
    if (this.rival.hp <= 0) {
      this.wave += 1;
      if (this.wave > 3) { this.finish(true); return; }
      this.rival = { pos: DimensionalMath.zeros(this.selectedLevel.dimension).map((_,i)=> i===0 ? 6+this.wave*2 : 0), hp: 100, cooldown: 0 };
    }
    if (this.player.hp <= 0) { this.finish(false); return; }
    const [px, py, pz] = Projection.to3D(this.player.pos);
    const [rx, ry, rz] = Projection.to3D(this.rival.pos);
    this.playerMesh.position.set(px, py + 0.5, pz);
    this.rivalMesh.position.set(rx, ry + 0.65, rz);
    this.camera.position.lerp(new THREE.Vector3(px + 6, py + 8, pz + 9), 0.06);
    this.camera.lookAt(px, py, pz);
    this.renderer.render(this.scene, this.camera);
    (document.getElementById('info')!).textContent = `Wave ${this.wave}/3 | Weapon ${this.playerWeapon} | Rival ${this.rivalWeapon}`;
    (document.getElementById('hp')!).textContent = `HP ${Math.max(0, Math.round(this.player.hp))} | Rival ${Math.max(0, Math.round(this.rival.hp))}`;
    (document.getElementById('dim')!).textContent = `Dim ${this.selectedLevel.dimension}D | Pos [${this.player.pos.map(v => v.toFixed(2)).join(', ')}]`;
  }

  private tryShoot(shooter: Entity, target: Entity, weapon: WeaponType, dist: number, trigger: boolean) {
    if (!trigger || shooter.cooldown > 0) return;
    const w = WEAPONS[weapon];
    if (dist > w.range) return;
    shooter.cooldown = w.cooldown;
    if (weapon === 'AR') {
      if (Math.random() > w.spread) target.hp -= w.damage;
    } else {
      let total = 0; for (let i = 0; i < 8; i++) if (Math.random() > w.spread) total += w.damage;
      target.hp -= total * Math.max(0.3, 1 - dist / w.range);
    }
  }

  private spawnDrone() {
    const pos = DimensionalMath.zeros(this.selectedLevel.dimension).map(() => (Math.random() - 0.5) * 8);
    const m = new THREE.Mesh(new THREE.TorusKnotGeometry(0.28, 0.1, 50, 8), new THREE.MeshStandardMaterial({ color: 0xffc45c, emissive: 0x553300 }));
    m.userData.pos = pos;
    this.scene.add(m);
    this.drones.push(m);
  }

  private finish(win: boolean) {
    if (this.renderer) this.renderer.dispose();
    this.resultText = win ? `Victory in ${this.selectedLevel.name}` : 'Simulation Failed';
    if (win) {
      this.unlocked = Math.max(this.unlocked, Math.min(5, this.selectedLevel.id + 1));
      localStorage.setItem('dd_unlocked', String(this.unlocked));
    }
    this.screen = 'result';
    this.renderUI();
  }

  private bind(id: string, fn: () => void) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }
}

new DuelGame();
