import { levels } from './levels.js';
import { LevelScene } from './levelScene.js';

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

function isLevelUnlocked(levelIndex) {
  const solvedLevels = getSolvedLevels();
  return levelIndex === 0 || solvedLevels.includes(levelIndex - 1);
}

function isLevelSolved(levelIndex) {
  return getSolvedLevels().includes(levelIndex);
}

class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }
  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.titleText = this.add.text(centerX, centerY - 80, 'Collision Effect', {
      fontSize: '48px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#f3f4f6'
    }).setOrigin(0.5);

    this.startButton = this.add.rectangle(centerX, centerY + 40, 220, 70, 0x3b82f6);
    this.startButton.setStrokeStyle(3, 0xffffff);
    this.startButton.setInteractive({ useHandCursor: true });

    this.startButtonText = this.add.text(centerX, centerY + 40, 'Start', {
      fontSize: '28px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.startButton.on('pointerdown', () => {
      this.scene.start('SelectLevelScene');
    });

    this.scale.on('resize', this.onResize, this);
  }

  onResize(gameSize) {
    const centerX = gameSize.width / 2;
    const centerY = gameSize.height / 2;
    if (this.titleText) this.titleText.setPosition(centerX, centerY - 80);
    if (this.startButton) this.startButton.setPosition(centerX, centerY + 40);
    if (this.startButtonText) this.startButtonText.setPosition(centerX, centerY + 40);
  }

  shutdown() {
    if (this.scale) {
      this.scale.off('resize', this.onResize, this);
    }
  }
}

class SelectLevelScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SelectLevelScene' });
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;
    const columns = 4;
    const boxWidth = 84;
    const boxHeight = 84;
    const gap = 16;
    const startX = (width - (columns * boxWidth + (columns - 1) * gap)) / 2;
    const startY = height / 2 - 70;

    this.add.text(width / 2, 70, 'Select Level', {
      fontSize: '32px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.backButton = this.add.rectangle(72, 40, 96, 44, 0x374151);
    this.backButton.setStrokeStyle(2, 0xffffff);
    this.backButton.setInteractive({ useHandCursor: true });
    this.backButton.on('pointerdown', () => this.scene.start('StartScene'));
    this.add.text(72, 40, 'Back', {
      fontSize: '20px',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    levels.forEach((level, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + column * (boxWidth + gap) + boxWidth / 2;
      const y = startY + row * (boxHeight + gap) + boxHeight / 2;
      const unlocked = isLevelUnlocked(index);
      const solved = isLevelSolved(index);
      const boxColor = unlocked ? (solved ? 0x22c55e : 0x3b82f6) : 0x374151;

      const box = this.add.rectangle(x, y, boxWidth, boxHeight, boxColor);
      box.setStrokeStyle(2, 0xffffff);
      box.setInteractive({ useHandCursor: true });

      const label = unlocked
        ? this.add.text(x, y - 4, `${index + 1}`, {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
          }).setOrigin(0.5)
        : this.add.text(x, y, '🔒', {
            fontSize: '30px',
            fontFamily: 'Arial',
            color: '#e5e7eb'
          }).setOrigin(0.5);

      if (unlocked) {
        box.on('pointerdown', () => this.scene.start('LevelScene', { levelIndex: index }));
      }
    });
  }
}

const config = {
  type: Phaser.AUTO,
  scale: {
    parent: 'game',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 900
  },
  backgroundColor: '#111827',
  scene: [StartScene, SelectLevelScene, LevelScene]
};

const game = new Phaser.Game(config);
