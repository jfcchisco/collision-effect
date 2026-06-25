class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  create() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(centerX, centerY - 80, 'Collision Effect', {
      fontSize: '48px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#f3f4f6'
    }).setOrigin(0.5);

    const startButton = this.add.rectangle(centerX, centerY + 40, 220, 70, 0x3b82f6);
    startButton.setStrokeStyle(3, 0xffffff);
    startButton.setInteractive({ useHandCursor: true });

    this.add.text(centerX, centerY + 40, 'Start', {
      fontSize: '28px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    startButton.on('pointerdown', () => {
      this.scene.start('LevelScene');
    });
  }
}

class LevelScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelScene' });
  }

  init(data) {
    this.levelIndex = data && data.levelIndex !== undefined ? data.levelIndex : 0;
  }

  create() {
    this.add.text(32, 28, 'Tap any orb to attract the others.\nDifferent colors must not collide.', {
      fontSize: '22px',
      fontFamily: 'Arial',
      color: '#e5e7eb',
      lineSpacing: 8
    }).setOrigin(0);

    this.add.text(32, 100, `Goal: collapse all ${this.getLevelSpawnPoints().length} orbs into the clicked orb without a color clash.`, {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#9ca3af'
    }).setOrigin(0);

    this.orbRadius = 12;
    this.orbs = [];
    this.levelState = 'ready';
    this.currentTarget = null;

    const spawnPoints = this.getLevelSpawnPoints();

    spawnPoints.forEach((entry) => {
      const color = entry.color === 'blue' ? 0x3b82f6 : entry.color === 'yellow' ? 0xfacc15 : 0xef4444;
      const orb = this.add.circle(entry.x, entry.y, this.orbRadius, color);
      orb.setStrokeStyle(3, 0xffffff);
      orb.setInteractive({ useHandCursor: true });

      orb.setData('kind', entry.color);
      orb.setData('moving', false);
      orb.setData('collected', false);
      orb.setData('target', null);

      orb.on('pointerdown', () => {
        if (this.levelState === 'failed' || this.levelState === 'won') return;
        if (orb.getData('collected') || orb.getData('moving')) return;
        this.triggerAttraction(orb);
      });

      this.orbs.push(orb);
    });

    this.updateOrbInteractivity();

    this.statusText = this.add.text(32, 520, '', {
      fontSize: '28px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0);

    this.add.text(32, 560, `Press R to restart | Level ${this.levelIndex + 1}`, {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: '#cbd5e1'
    }).setOrigin(0);

    this.createNavigationButtons();

    this.input.keyboard.on('keydown-R', () => this.scene.restart());
  }

  createNavigationButtons() {
    const homeButton = this.add.rectangle(500, 720, 90, 42, 0x374151);
    homeButton.setStrokeStyle(2, 0xffffff);
    homeButton.setInteractive({ useHandCursor: true });
    this.add.text(500, 720, 'Home', {
      fontSize: '20px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    homeButton.on('pointerdown', () => this.scene.start('StartScene'));

    this.nextLevelButton = this.add.rectangle(500, 680, 130, 42, 0x22c55e);
    this.nextLevelButton.setStrokeStyle(2, 0xffffff);
    this.nextLevelButton.setInteractive({ useHandCursor: true });
    this.nextLevelButton.setVisible(false);
    this.nextLevelButton.on('pointerdown', () => {
      const nextLevelIndex = this.levelIndex + 1;
      const levels = this.getLevels();
      if (nextLevelIndex < levels.length) {
        this.scene.start('LevelScene', { levelIndex: nextLevelIndex });
      }
    });

    this.nextLevelText = this.add.text(500, 680, 'Next Level', {
      fontSize: '20px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.nextLevelText.setVisible(false);
  }

  getLevels() {
    return [
      [
        { x: 120, y: 220, color: 'blue' },
        { x: 480, y: 220, color: 'red' },
        { x: 120, y: 380, color: 'red' },
        { x: 480, y: 380, color: 'blue' }
      ],
      [
        { x: 120, y: 220, color: 'blue' },
        { x: 480, y: 220, color: 'red' },
        { x: 120, y: 380, color: 'red' },
        { x: 480, y: 380, color: 'blue' },
        { x: 300, y: 300, color: 'blue' },
        { x: 200, y: 300, color: 'yellow' },
        { x: 400, y: 300, color: 'yellow' }
      ]
    ];
  }

  getLevelSpawnPoints() {
    const levels = this.getLevels();

    return levels[this.levelIndex] || levels[0];
  }

  updateOrbInteractivity() {
    this.orbs.forEach((orb) => {
      if (this.levelState === 'failed' || this.levelState === 'won' || orb.getData('collected') || orb.getData('moving')) {
        orb.disableInteractive();
      } else {
        orb.setInteractive({ useHandCursor: true });
      }
    });
  }

  triggerAttraction(clickedOrb) {
    if (clickedOrb.getData('collected') || clickedOrb.getData('moving')) return;

    this.levelState = 'active';
    this.currentTarget = clickedOrb;
    clickedOrb.setData('collected', true);
    const targetKind = clickedOrb.getData('kind');

    this.orbs.forEach((orb) => {
      if (orb === clickedOrb || orb.getData('collected')) return;
      if (orb.getData('kind') !== targetKind) return;
      orb.setData('moving', true);
      orb.setData('target', clickedOrb);
    });

    this.updateOrbInteractivity();
  }

  update(time, delta) {
    if (this.levelState !== 'active') return;

    const speed = 230;
    const step = speed * (delta / 1000);

    this.orbs.forEach((orb) => {
      if (orb.getData('collected') || !orb.getData('moving')) return;

      const target = orb.getData('target');
      const dx = target.x - orb.x;
      const dy = target.y - orb.y;
      const distance = Math.hypot(dx, dy);

      const move = Math.min(step, distance);
      const nextX = orb.x + (dx / distance) * move;
      const nextY = orb.y + (dy / distance) * move;

      const collisionTargets = this.orbs.filter((other) => other !== orb);
      const hit = collisionTargets.some((other) => {
        if (other.getData('kind') === orb.getData('kind')) return false;
        return Phaser.Math.Distance.Between(nextX, nextY, other.x, other.y) <= this.orbRadius * 2;
      });

      if (hit) {
        this.failLevel();
        return;
      }

      orb.x = nextX;
      orb.y = nextY;

      if (distance <= step) {
        orb.x = target.x;
        orb.y = target.y;
        orb.setData('moving', false);
        orb.setData('collected', true);
        orb.setVisible(false);
        this.updateOrbInteractivity();
      }
    });

    this.checkCollisions();
    this.checkWin();
  }

  checkCollisions() {
    if (this.levelState !== 'active') return;

    const collisionCandidates = this.orbs.filter((orb) => orb === this.currentTarget || !orb.getData('collected'));

    for (let i = 0; i < collisionCandidates.length; i++) {
      for (let j = i + 1; j < collisionCandidates.length; j++) {
        const a = collisionCandidates[i];
        const b = collisionCandidates[j];

        if (a === b || a.getData('kind') === b.getData('kind')) continue;

        const distance = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        if (distance <= this.orbRadius * 2) {
          this.failLevel();
          return;
        }
      }
    }
  }

  checkWin() {
    if (this.levelState !== 'active' || !this.currentTarget) return;

    const pending = this.orbs.filter((orb) => !orb.getData('collected'));
    if (pending.length === 0) {
      this.winLevel();
    }
  }

  failLevel() {
    this.levelState = 'failed';
    this.updateOrbInteractivity();
    this.statusText.setText('Level Failed');
    this.statusText.setColor('#f87171');
  }

  winLevel() {
    this.levelState = 'won';
    this.updateOrbInteractivity();
    this.statusText.setText(`Level ${this.levelIndex + 1} Cleared`);
    this.statusText.setColor('#86efac');

    const nextLevelIndex = this.levelIndex + 1;
    const levels = this.getLevels();

    if (nextLevelIndex < levels.length) {
      this.nextLevelButton.setVisible(true);
      this.nextLevelText.setVisible(true);
    }
  }
}

const config = {
  type: Phaser.AUTO,
  width: 600,
  height: 800,
  parent: 'game',
  backgroundColor: '#111827',
  scene: [StartScene, LevelScene]
};

new Phaser.Game(config);
