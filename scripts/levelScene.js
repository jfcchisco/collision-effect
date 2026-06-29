import { levels } from './levels.js';

const PROGRESS_STORAGE_KEY = 'collision-effect-solved-levels';

function getSolvedLevels() {
  try {
    const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => Number.isInteger(value) && value >= 0) : [];
  } catch (error) {
    return [];
  }
}

function saveSolvedLevels(solvedLevels) {
  try {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(solvedLevels));
  } catch (error) {
    // Ignore storage errors.
  }
}

function markLevelSolved(levelIndex) {
  const solvedLevels = getSolvedLevels();
  if (!solvedLevels.includes(levelIndex)) {
    solvedLevels.push(levelIndex);
    solvedLevels.sort((a, b) => a - b);
    saveSolvedLevels(solvedLevels);
  }
}

export class LevelScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelScene' });
  }

  init(data) {
    this.levelIndex = data && data.levelIndex !== undefined ? data.levelIndex : 0;
  }

  create() {
    this.orbRadius = 12;
    this.orbs = [];
    this.levelState = 'ready';
    this.currentTarget = null;
    this.overlayVisible = false;
    this.speedMultiplier = 200;

    const spawnPoints = this.getLevelSpawnPoints();

    spawnPoints.forEach((entry) => {
      const color = entry.color === 'blue' ? 0x3b82f6 : entry.color === 'yellow' ? 0xfacc15 : 0xef4444;
      const glow = this.add.circle(entry.x, entry.y, this.orbRadius + 8, color);
      glow.setAlpha(0.22);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setDepth(-1);

      const orb = this.add.circle(entry.x, entry.y, this.orbRadius, color);
      orb.setStrokeStyle(3, 0xaaaaaa);
      orb.setInteractive({ useHandCursor: true });

      orb.setData('kind', entry.color);
      orb.setData('moving', false);
      orb.setData('collected', false);
      orb.setData('target', null);
      orb.setData('glow', glow);

      orb.on('pointerdown', () => {
        if (this.levelState === 'failed' || this.levelState === 'won') return;
        if (orb.getData('collected') || orb.getData('moving')) return;
        this.triggerAttraction(orb);
      });

      this.orbs.push(orb);
    });

    this.updateOrbInteractivity();

    this.levelLabel = this.add.text(24, 24, `Level ${this.levelIndex + 1}`, {
      fontSize: '24px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0);

    this.pauseButton = this.add.rectangle(this.scale.width - 72, 40, 96, 44, 0x374151);
    this.pauseButton.setStrokeStyle(2, 0xffffff);
    this.pauseButton.setInteractive({ useHandCursor: true });
    this.pauseButtonText = this.add.text(this.scale.width - 72, 40, 'Pause', {
      fontSize: '20px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.createBottomButtons();
    this.positionLevelUI();
    this.scale.on('resize', this.onResize, this);

    this.input.keyboard.on('keydown-R', () => this.scene.restart());

    this.createOutcomeOverlay();
  }

  createOutcomeOverlay() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.overlayBg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000);
    this.overlayBg.setAlpha(0.55);
    this.overlayBg.setVisible(false);
    this.overlayBg.setDepth(100);

    this.overlayContainer = this.add.container(width / 2, height / 2);
    this.overlayContainer.setVisible(false);
    this.overlayContainer.setDepth(101);

    const panelWidth = Math.min(260, width * 0.7);
    const panelHeight = 220;
    const panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x111827);
    panel.setStrokeStyle(2, 0xffffff);
    panel.setAlpha(0.95);
    this.overlayContainer.add(panel);

    this.overlayTitle = this.add.text(0, -70, 'Level Cleared', {
      fontSize: '28px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.overlayContainer.add(this.overlayTitle);

    const buttonWidth = 180;
    const buttonHeight = 48;
    const buttonY = [0, 55, 110];
    const labels = ['Next Level', 'Retry', 'Home'];

    this.overlayButtons = [];
    labels.forEach((label, index) => {
      const button = this.add.rectangle(0, buttonY[index], buttonWidth, buttonHeight, index === 0 ? 0x22c55e : index === 1 ? 0x3b82f6 : 0x374151);
      button.setStrokeStyle(2, 0xffffff);
      button.setInteractive({ useHandCursor: true });
      const text = this.add.text(0, buttonY[index], label, {
        fontSize: '20px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);

      button.on('pointerdown', () => this.handleOverlayAction(label));
      this.overlayContainer.add(button);
      this.overlayContainer.add(text);
      this.overlayButtons.push({ button, text });
    });

    this.updateOutcomeOverlay();
  }

  updateOutcomeOverlay() {
    if (!this.scene || !this.scene.isActive()) return;
    if (!this.overlayContainer || !this.overlayBg || !this.overlayContainer.active || !this.overlayBg.active) return;

    const isVisible = this.levelState === 'won' && this.overlayVisible;
    this.overlayBg.setVisible(isVisible);
    this.overlayContainer.setVisible(isVisible);

    if (!isVisible) return;

    const width = this.scale.width;
    const height = this.scale.height;
    this.overlayBg.setPosition(width / 2, height / 2);
    this.overlayBg.setSize(width, height);
    this.overlayContainer.setPosition(width / 2, height / 2);

    const isLastLevel = this.levelIndex + 1 >= this.getLevels().length;
    const nextButton = this.overlayButtons && this.overlayButtons[0];
    if (nextButton) {
      nextButton.button.setVisible(!isLastLevel);
      nextButton.text.setVisible(!isLastLevel);
    }

    if (isLastLevel) {
      this.overlayTitle.setText('Level Complete');
    } else {
      this.overlayTitle.setText('Level Cleared');
    }
  }

  handleOverlayAction(action) {
    this.overlayVisible = false;
    this.overlayBg = null;
    this.overlayContainer = null;

    if (action === 'Next Level') {
      const nextLevelIndex = this.levelIndex + 1;
      const levelList = this.getLevels();
      if (nextLevelIndex < levelList.length) {
        this.scene.start('LevelScene', { levelIndex: nextLevelIndex });
      }
      return;
    }

    if (action === 'Retry') {
      this.scene.restart();
      return;
    }

    if (action === 'Home') {
      this.scene.start('StartScene');
    }
  }

  createBottomButtons() {
    const buttonWidth = 84;
    const buttonHeight = 44;
    const gap = 20;
    const totalWidth = buttonWidth * 4 + gap * 3;
    const startX = (this.scale.width - totalWidth) / 2;
    const buttonY = this.scale.height - 56;

    this.bottomButtons = [];
    const speedOptions = [
      { label: '1', value: 50, symbol: '>' },
      { label: '2', value: 200, symbol: '>>' },
      { label: '3', value: 500, symbol: '>>>' }
    ];

    speedOptions.forEach((option, index) => {
      const x = startX + index * (buttonWidth + gap) + buttonWidth / 2;
      const button = this.add.rectangle(x, buttonY, buttonWidth, buttonHeight, 0x4b5563);
      button.setStrokeStyle(0, 0xffffff);
      button.setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.setSpeed(option.value));

      const text = this.add.text(x, buttonY, option.symbol, {
        fontSize: '20px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#ffffff'
      }).setOrigin(0.5);

      this.bottomButtons.push({ button, text, value: option.value });
    });

    const restartButtonX = startX + 3 * (buttonWidth + gap) + buttonWidth / 2;
    const restartButton = this.add.rectangle(restartButtonX, buttonY, buttonWidth, buttonHeight, 0x4b5563);
    restartButton.setStrokeStyle(0, 0xffffff);
    restartButton.setInteractive({ useHandCursor: true });
    restartButton.on('pointerdown', () => this.scene.restart());
    const restartText = this.add.text(restartButtonX, buttonY, '↺', {
      fontSize: '24px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.bottomButtons.push({ button: restartButton, text: restartText, isRestart: true });
    this.setSpeed(this.speedMultiplier);
  }

  positionLevelUI() {
    const width = this.scale.width;
    const height = this.scale.height;

    if (this.levelLabel) this.levelLabel.setPosition(24, 24);

    if (this.pauseButton) this.pauseButton.setPosition(width - 72, 40);
    if (this.pauseButtonText) this.pauseButtonText.setPosition(width - 72, 40);

    if (this.bottomButtons && this.bottomButtons.length) {
      const buttonWidth = 84;
      const buttonHeight = 44;
      const gap = 20;
      const totalWidth = buttonWidth * 4 + gap * 3;
      const startX = (width - totalWidth) / 2;
      const buttonY = height - 56;

      this.bottomButtons.forEach((entry, index) => {
        const x = index < 3
          ? startX + index * (buttonWidth + gap) + buttonWidth / 2
          : startX + 3 * (buttonWidth + gap) + buttonWidth / 2;
        entry.button.setPosition(x, buttonY);
        entry.text.setPosition(x, buttonY);
      });
    }

    this.updateOutcomeOverlay();
  }

  onResize(gameSize) {
    if (!gameSize) return;
    if (typeof this.positionLevelUI === 'function') {
      this.positionLevelUI();
    }
    if (typeof this.updateOutcomeOverlay === 'function') {
      this.updateOutcomeOverlay();
    }
  }

  shutdown() {
    this.overlayVisible = false;
    if (this.scale) {
      this.scale.off('resize', this.onResize, this);
    }
    if (this.overlayBg) {
      this.overlayBg.destroy();
      this.overlayBg = null;
    }
    if (this.overlayContainer) {
      this.overlayContainer.destroy();
      this.overlayContainer = null;
    }
  }

  getLevels() {
    return levels;
  }

  getLevelSpawnPoints() {
    const levelList = this.getLevels();
    const level = levelList[this.levelIndex] || levelList[0];
    const width = this.scale.width;
    const height = this.scale.height;

    return level.map((entry) => ({
      x: entry.x * width,
      y: entry.y * height,
      color: entry.color
    }));
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

  setSpeed(speed) {
    this.speedMultiplier = speed;

    this.bottomButtons.forEach((entry) => {
      if (entry.isRestart) return;
      const isSelected = entry.value === speed;
      entry.button.setStrokeStyle(isSelected ? 2 : 0, isSelected ? 0xffffff : 0xffffff);
      entry.button.setFillStyle(isSelected ? 0x4b5563 : 0x374151);
    });
  }

  update(time, delta) {
    if (this.levelState !== 'active') return;

    const speed = this.speedMultiplier;
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

      const glow = orb.getData('glow');
      if (glow) {
        glow.setPosition(orb.x, orb.y);
        glow.setVisible(orb.visible);
      }

      if (distance <= step) {
        orb.x = target.x;
        orb.y = target.y;
        orb.setData('moving', false);
        orb.setData('collected', true);
        orb.setVisible(false);
        if (glow) {
          glow.setVisible(false);
        }
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
  }

  winLevel() {
    this.levelState = 'won';
    this.overlayVisible = true;
    markLevelSolved(this.levelIndex);
    this.updateOrbInteractivity();
    this.updateOutcomeOverlay();
  }
}
