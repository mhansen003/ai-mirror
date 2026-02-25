import type { ExpressionState, BehaviorOutput } from '@/types/expressions';
import { DEFAULT_EXPRESSION } from '@/types/expressions';
import { lerp, clamp } from './lerp';

/** A single expression command the player must perform */
interface Command {
  name: string;
  displayText: string;
  /** The target expression the avatar demonstrates */
  targetExpr: ExpressionState;
  /** Which blendshape keys to evaluate for grading */
  gradeKeys: (keyof ExpressionState)[];
  /** Minimum value the graded keys should reach to count as "doing it" */
  threshold: number;
}

type RoundPhase = 'countdown' | 'show' | 'do' | 'grade' | 'trick_fail' | 'rest' | 'game_over';

const COMMANDS: Command[] = [
  {
    name: 'smile',
    displayText: 'SMILE',
    targetExpr: {
      ...DEFAULT_EXPRESSION,
      mouthSmileLeft: 0.8, mouthSmileRight: 0.8, mouthOpen: 0.1,
      eyeBlinkLeft: 0.15, eyeBlinkRight: 0.15, cheekPuff: 0.1,
    },
    gradeKeys: ['mouthSmileLeft', 'mouthSmileRight'],
    threshold: 0.25,
  },
  {
    name: 'surprise',
    displayText: 'LOOK SURPRISED',
    targetExpr: {
      ...DEFAULT_EXPRESSION,
      mouthOpen: 0.6, eyeWideLeft: 0.7, eyeWideRight: 0.7,
      browInnerUp: 0.8, browOuterUpLeft: 0.6, browOuterUpRight: 0.6,
    },
    gradeKeys: ['mouthOpen', 'eyeWideLeft', 'eyeWideRight', 'browInnerUp'],
    threshold: 0.2,
  },
  {
    name: 'raise_brows',
    displayText: 'RAISE YOUR EYEBROWS',
    targetExpr: {
      ...DEFAULT_EXPRESSION,
      browInnerUp: 0.7, browOuterUpLeft: 0.7, browOuterUpRight: 0.7,
      eyeWideLeft: 0.3, eyeWideRight: 0.3,
    },
    gradeKeys: ['browInnerUp', 'browOuterUpLeft', 'browOuterUpRight'],
    threshold: 0.2,
  },
  {
    name: 'open_mouth',
    displayText: 'OPEN WIDE',
    targetExpr: {
      ...DEFAULT_EXPRESSION,
      mouthOpen: 0.8, browInnerUp: 0.2,
    },
    gradeKeys: ['mouthOpen'],
    threshold: 0.3,
  },
  {
    name: 'wink_left',
    displayText: 'WINK LEFT',
    targetExpr: {
      ...DEFAULT_EXPRESSION,
      eyeBlinkLeft: 0.9, mouthSmileLeft: 0.4, mouthSmileRight: 0.2,
      browOuterUpRight: 0.3,
    },
    gradeKeys: ['eyeBlinkLeft'],
    threshold: 0.4,
  },
  {
    name: 'wink_right',
    displayText: 'WINK RIGHT',
    targetExpr: {
      ...DEFAULT_EXPRESSION,
      eyeBlinkRight: 0.9, mouthSmileLeft: 0.2, mouthSmileRight: 0.4,
      browOuterUpLeft: 0.3,
    },
    gradeKeys: ['eyeBlinkRight'],
    threshold: 0.4,
  },
  {
    name: 'pucker',
    displayText: 'PUCKER UP',
    targetExpr: {
      ...DEFAULT_EXPRESSION,
      mouthPucker: 0.8, browInnerUp: 0.2,
      eyeWideLeft: 0.2, eyeWideRight: 0.2,
    },
    gradeKeys: ['mouthPucker'],
    threshold: 0.2,
  },
  {
    name: 'puff_cheeks',
    displayText: 'PUFF YOUR CHEEKS',
    targetExpr: {
      ...DEFAULT_EXPRESSION,
      cheekPuff: 0.7, mouthPucker: 0.2,
      eyeBlinkLeft: 0.15, eyeBlinkRight: 0.15,
    },
    gradeKeys: ['cheekPuff'],
    threshold: 0.2,
  },
  {
    name: 'frown',
    displayText: 'FROWN',
    targetExpr: {
      ...DEFAULT_EXPRESSION,
      mouthFrown: 0.6, browDownLeft: 0.5, browDownRight: 0.5,
      eyeBlinkLeft: 0.15, eyeBlinkRight: 0.15,
    },
    gradeKeys: ['mouthFrown', 'browDownLeft', 'browDownRight'],
    threshold: 0.15,
  },
  {
    name: 'blink',
    displayText: 'BLINK HARD',
    targetExpr: {
      ...DEFAULT_EXPRESSION,
      eyeBlinkLeft: 0.95, eyeBlinkRight: 0.95,
    },
    gradeKeys: ['eyeBlinkLeft', 'eyeBlinkRight'],
    threshold: 0.5,
  },
];

/** Combo commands for higher difficulty */
const COMBOS: Command[] = [
  {
    name: 'smile_brows',
    displayText: 'SMILE + EYEBROWS UP',
    targetExpr: {
      ...DEFAULT_EXPRESSION,
      mouthSmileLeft: 0.7, mouthSmileRight: 0.7,
      browInnerUp: 0.6, browOuterUpLeft: 0.5, browOuterUpRight: 0.5,
    },
    gradeKeys: ['mouthSmileLeft', 'mouthSmileRight', 'browInnerUp'],
    threshold: 0.2,
  },
  {
    name: 'surprise_pucker',
    displayText: 'SURPRISED PUCKER',
    targetExpr: {
      ...DEFAULT_EXPRESSION,
      mouthPucker: 0.6, eyeWideLeft: 0.6, eyeWideRight: 0.6,
      browInnerUp: 0.5,
    },
    gradeKeys: ['mouthPucker', 'eyeWideLeft', 'eyeWideRight'],
    threshold: 0.2,
  },
  {
    name: 'angry_open',
    displayText: 'ANGRY YELL',
    targetExpr: {
      ...DEFAULT_EXPRESSION,
      mouthOpen: 0.7, browDownLeft: 0.6, browDownRight: 0.6,
      eyeWideLeft: 0.3, eyeWideRight: 0.3,
    },
    gradeKeys: ['mouthOpen', 'browDownLeft', 'browDownRight'],
    threshold: 0.2,
  },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getLetterGrade(pct: number): { letter: string; color: string } {
  if (pct >= 90) return { letter: 'A+', color: '#00ffcc' };
  if (pct >= 80) return { letter: 'A', color: '#00ffcc' };
  if (pct >= 70) return { letter: 'B', color: '#00ccff' };
  if (pct >= 60) return { letter: 'C', color: '#ffcc00' };
  if (pct >= 50) return { letter: 'D', color: '#ff8800' };
  return { letter: 'F', color: '#ff2244' };
}

const TAUNTS_GOOD = ['NICE!', 'NAILED IT!', 'IMPRESSIVE!', 'SMOOTH!', 'CLEAN!', 'ON POINT!'];
const TAUNTS_OK = ['NOT BAD.', 'DECENT.', 'PASSABLE.', 'COULD BE WORSE.', 'EH, OKAY.'];
const TAUNTS_BAD = ['YIKES.', 'TRY HARDER.', 'REALLY?', 'THAT WAS BAD.', 'OUCH.', 'NOPE.'];
const TRICK_CAUGHT = ['GOTCHA!', 'DIDN\'T SAY SIMON SAYS!', 'TRICKED YOU!', 'FELL FOR IT!', 'PAY ATTENTION!'];
const TRICK_SURVIVED = ['SHARP.', 'CAN\'T FOOL YOU.', 'NICE CATCH.', 'PAYING ATTENTION!'];

/**
 * Simon Says game engine.
 * Shows expression commands, player must match them, gets graded on accuracy.
 * Difficulty ramps: faster timing, combos, and "trick" rounds (no "Simon Says").
 */
export class SimonSaysEngine {
  private phase: RoundPhase = 'countdown';
  private phaseTimer = 0;
  private frame = 0;

  // Current round
  private round = 0;
  private currentCommand: Command | null = null;
  private isSimonSays = true; // false = trick round, player should NOT do it
  private roundHistory: { command: string; score: number; tricked: boolean }[] = [];

  // Grading
  private bestMatchThisRound = 0;
  private peakScores: number[] = []; // sampled scores during "do" phase
  private roundGrade = 0;
  private roundLetter = { letter: '', color: '' };
  private playerMoved = false; // did player make the expression during trick round?

  // Overall
  private totalScore = 0;
  private maxPossibleScore = 0;
  private streak = 0;
  private lives = 3;
  private combo = 1;

  // Smoothed avatar expression
  private avatarExpr: ExpressionState = { ...DEFAULT_EXPRESSION };
  private targetAvatarExpr: ExpressionState = { ...DEFAULT_EXPRESSION };

  // Display
  private displayText = '';
  private subText = '';
  private energy = 0.5;
  private flashColor: string | null = null;
  private flashTimer = 0;

  // Timing (frames) — gets shorter with difficulty
  private get showDuration() { return Math.max(70, 120 - this.round * 4); }
  private get doDuration() { return Math.max(80, 150 - this.round * 5); }
  private get gradeDuration() { return 80; }
  private get restDuration() { return 40; }
  private get countdownDuration() { return 180; } // 3 seconds

  // Difficulty
  private get difficulty(): number { return Math.min(Math.floor(this.round / 3), 5); }
  private get trickChance(): number { return Math.min(0.05 + this.difficulty * 0.07, 0.35); }
  private get useCombos(): boolean { return this.difficulty >= 2; }

  reset() {
    this.phase = 'countdown';
    this.phaseTimer = 0;
    this.frame = 0;
    this.round = 0;
    this.totalScore = 0;
    this.maxPossibleScore = 0;
    this.streak = 0;
    this.lives = 3;
    this.combo = 1;
    this.roundHistory = [];
    this.avatarExpr = { ...DEFAULT_EXPRESSION };
    this.targetAvatarExpr = { ...DEFAULT_EXPRESSION };
    this.displayText = '';
    this.subText = '';
  }

  update(userExpr: ExpressionState): BehaviorOutput {
    this.frame++;
    this.phaseTimer++;
    this.flashTimer = Math.max(0, this.flashTimer - 1);
    if (this.flashTimer === 0) this.flashColor = null;

    switch (this.phase) {
      case 'countdown':
        this.updateCountdown();
        break;
      case 'show':
        this.updateShow();
        break;
      case 'do':
        this.updateDo(userExpr);
        break;
      case 'grade':
        this.updateGrade();
        break;
      case 'trick_fail':
        this.updateTrickFail();
        break;
      case 'rest':
        this.updateRest();
        break;
      case 'game_over':
        this.updateGameOver();
        break;
    }

    // Smooth avatar expression
    for (const key of Object.keys(this.avatarExpr) as (keyof ExpressionState)[]) {
      this.avatarExpr[key] = lerp(this.avatarExpr[key], this.targetAvatarExpr[key], 0.12);
    }

    // Breathing
    const finalExpr = { ...this.avatarExpr };
    finalExpr.headPitch += Math.sin(this.frame * 0.02) * 0.005;

    return {
      avatarExpression: finalExpr,
      mode: 'idle', // renderer doesn't need to know the mode
      displayText: this.displayText,
      subText: this.subText,
      energy: this.energy,
      flashColor: this.flashTimer > 0 ? this.flashColor : null,
    };
  }

  private updateCountdown() {
    const remaining = Math.ceil((this.countdownDuration - this.phaseTimer) / 60);
    this.targetAvatarExpr = { ...DEFAULT_EXPRESSION };
    this.energy = 0.4;

    if (remaining > 0) {
      this.displayText = `GET READY`;
      this.subText = `STARTING IN ${remaining}...`;
    }

    if (this.phaseTimer >= this.countdownDuration) {
      this.startNextRound();
    }
  }

  private updateShow() {
    if (!this.currentCommand) return;

    // Avatar demonstrates the expression
    this.targetAvatarExpr = this.currentCommand.targetExpr;
    this.energy = 0.6;

    const prefix = this.isSimonSays ? 'SIMON SAYS:' : '';
    this.displayText = `${prefix} ${this.currentCommand.displayText}`;

    // Progress bar for show phase
    const progress = this.phaseTimer / this.showDuration;
    const bars = Math.round(progress * 10);
    this.subText = `WATCH ${'█'.repeat(bars)}${'░'.repeat(10 - bars)} ROUND ${this.round}`;

    if (this.phaseTimer >= this.showDuration) {
      this.switchPhase('do');
      this.bestMatchThisRound = 0;
      this.peakScores = [];
      this.playerMoved = false;
    }
  }

  private updateDo(userExpr: ExpressionState) {
    if (!this.currentCommand) return;

    // Avatar holds neutral — watches the player
    this.targetAvatarExpr = { ...DEFAULT_EXPRESSION };
    this.targetAvatarExpr.eyeWideLeft = 0.2;
    this.targetAvatarExpr.eyeWideRight = 0.2;

    // Calculate match score
    const matchScore = this.calculateMatch(userExpr, this.currentCommand);
    this.peakScores.push(matchScore);
    this.bestMatchThisRound = Math.max(this.bestMatchThisRound, matchScore);

    // Check if player is making ANY expression (for trick detection)
    if (matchScore > 0.3) {
      this.playerMoved = true;
    }

    // Countdown bar
    const remaining = this.doDuration - this.phaseTimer;
    const progress = this.phaseTimer / this.doDuration;
    const bars = Math.round((1 - progress) * 10);
    const urgencyColor = progress > 0.7 ? '!' : '';

    this.displayText = 'YOUR TURN' + urgencyColor;
    const matchPct = Math.round(matchScore * 100);
    this.subText = `MATCH: ${matchPct}% ${'█'.repeat(bars)}${'░'.repeat(10 - bars)}`;
    this.energy = 0.5 + matchScore * 0.4;

    // Real-time feedback color
    if (matchScore > 0.6) {
      this.energy = 0.9;
    }

    if (this.phaseTimer >= this.doDuration) {
      // Time's up — grade the round
      if (!this.isSimonSays) {
        // Trick round — did the player fall for it?
        if (this.playerMoved) {
          this.switchPhase('trick_fail');
        } else {
          // Player correctly didn't do it
          this.displayText = pick(TRICK_SURVIVED);
          this.streak++;
          this.totalScore += 50 * this.combo;
          this.flash('#00ffcc');
          this.switchPhase('grade');
          this.roundGrade = 100;
          this.roundLetter = { letter: '✓', color: '#00ffcc' };
        }
      } else {
        this.gradeRound();
        this.switchPhase('grade');
      }
    }
  }

  private updateGrade() {
    // Avatar reacts to grade
    if (this.roundGrade >= 70) {
      this.targetAvatarExpr = {
        ...DEFAULT_EXPRESSION,
        mouthSmileLeft: 0.6, mouthSmileRight: 0.6,
        browInnerUp: 0.2,
      };
    } else if (this.roundGrade >= 40) {
      this.targetAvatarExpr = {
        ...DEFAULT_EXPRESSION,
        browOuterUpLeft: 0.5, mouthFrown: 0.1, headYaw: 0.04,
      };
    } else {
      this.targetAvatarExpr = {
        ...DEFAULT_EXPRESSION,
        mouthFrown: 0.4, browDownLeft: 0.3, browDownRight: 0.3,
        headPitch: 0.03,
      };
    }

    this.energy = 0.5 + (this.roundGrade / 100) * 0.4;

    if (this.phaseTimer >= this.gradeDuration) {
      if (this.lives <= 0) {
        this.switchPhase('game_over');
      } else {
        this.switchPhase('rest');
      }
    }
  }

  private updateTrickFail() {
    this.displayText = pick(TRICK_CAUGHT);
    this.targetAvatarExpr = {
      ...DEFAULT_EXPRESSION,
      mouthSmileLeft: 0.5, mouthSmileRight: 0.5,
      eyeBlinkRight: 0.8, browOuterUpLeft: 0.5,
    };
    this.energy = 0.8;

    if (this.phaseTimer === 1) {
      this.lives--;
      this.streak = 0;
      this.combo = 1;
      this.flash('#ff2244');
      this.roundGrade = 0;
      this.roundLetter = { letter: 'X', color: '#ff2244' };
    }

    const livesText = '♥'.repeat(this.lives) + '♡'.repeat(3 - this.lives);
    this.subText = `${livesText}  SCORE: ${this.totalScore}`;

    if (this.phaseTimer >= this.gradeDuration) {
      if (this.lives <= 0) {
        this.switchPhase('game_over');
      } else {
        this.switchPhase('rest');
      }
    }
  }

  private updateRest() {
    this.targetAvatarExpr = { ...DEFAULT_EXPRESSION };
    this.displayText = '';
    this.subText = '';
    this.energy = 0.3;

    if (this.phaseTimer >= this.restDuration) {
      this.startNextRound();
    }
  }

  private updateGameOver() {
    this.targetAvatarExpr = {
      ...DEFAULT_EXPRESSION,
      mouthFrown: 0.3, browInnerUp: 0.4, headPitch: 0.03,
    };

    const overallPct = this.maxPossibleScore > 0
      ? Math.round((this.totalScore / this.maxPossibleScore) * 100)
      : 0;
    const overall = getLetterGrade(overallPct);

    this.displayText = 'GAME OVER';
    this.subText = `ROUNDS: ${this.round}  SCORE: ${this.totalScore}  GRADE: ${overall.letter}`;
    this.energy = 0.3;

    // Auto-restart after delay
    if (this.phaseTimer >= 360) {
      this.reset();
    }
  }

  private startNextRound() {
    this.round++;

    // Pick command
    const pool = this.useCombos ? [...COMMANDS, ...COMBOS] : COMMANDS;
    this.currentCommand = pick(pool);

    // Trick rounds (no "Simon Says") start appearing at difficulty 1+
    this.isSimonSays = this.difficulty < 1 || Math.random() > this.trickChance;

    this.switchPhase('show');
  }

  private gradeRound() {
    // Use the top 25% of sampled scores (player's best sustained effort)
    const sorted = [...this.peakScores].sort((a, b) => b - a);
    const topN = Math.max(1, Math.floor(sorted.length * 0.25));
    const topAvg = sorted.slice(0, topN).reduce((s, v) => s + v, 0) / topN;

    this.roundGrade = Math.round(clamp(topAvg * 100, 0, 100));
    this.roundLetter = getLetterGrade(this.roundGrade);

    // Scoring
    const basePoints = this.roundGrade;
    const comboPoints = basePoints * this.combo;
    this.totalScore += Math.round(comboPoints);
    this.maxPossibleScore += 100 * this.combo;

    // Streak / combo
    if (this.roundGrade >= 60) {
      this.streak++;
      this.combo = Math.min(1 + Math.floor(this.streak / 3) * 0.5, 3);
    } else {
      this.streak = 0;
      this.combo = 1;
    }

    // Lose a life for really bad rounds
    if (this.roundGrade < 30) {
      this.lives--;
      this.flash('#ff2244');
    } else if (this.roundGrade >= 80) {
      this.flash('#00ffcc');
    } else if (this.roundGrade >= 60) {
      this.flash('#00ccff');
    }

    // Display
    const taunt = this.roundGrade >= 70 ? pick(TAUNTS_GOOD)
      : this.roundGrade >= 45 ? pick(TAUNTS_OK)
      : pick(TAUNTS_BAD);

    this.displayText = `${this.roundLetter.letter}  ${taunt}`;

    const livesText = '♥'.repeat(Math.max(0, this.lives)) + '♡'.repeat(Math.max(0, 3 - this.lives));
    const streakText = this.streak >= 3 ? `  🔥x${this.streak}` : '';
    const comboText = this.combo > 1 ? `  ${this.combo}x` : '';
    this.subText = `${livesText}  SCORE: ${this.totalScore}${comboText}${streakText}  ROUND ${this.round}`;

    this.roundHistory.push({
      command: this.currentCommand?.name ?? '',
      score: this.roundGrade,
      tricked: false,
    });
  }

  private calculateMatch(userExpr: ExpressionState, command: Command): number {
    let totalMatch = 0;
    for (const key of command.gradeKeys) {
      const target = command.targetExpr[key];
      const actual = userExpr[key];
      // How close is the user to the target? (normalized 0-1)
      const diff = Math.abs(target - actual);
      const maxDiff = Math.max(target, 0.3); // at least 0.3 range
      const match = clamp(1 - diff / maxDiff, 0, 1);
      totalMatch += match;
    }
    return totalMatch / command.gradeKeys.length;
  }

  private switchPhase(phase: RoundPhase) {
    this.phase = phase;
    this.phaseTimer = 0;
  }

  private flash(color: string) {
    this.flashColor = color;
    this.flashTimer = 20;
  }
}
