import type { ExpressionState, BehaviorOutput, BehaviorMode } from '@/types/expressions';
import { DEFAULT_EXPRESSION } from '@/types/expressions';
import { lerp, clamp } from './lerp';

/** Predefined avatar expressions for various moods */
const EXPRESSIONS = {
  neutral: { ...DEFAULT_EXPRESSION },
  smirk: {
    ...DEFAULT_EXPRESSION,
    mouthSmileLeft: 0.0,
    mouthSmileRight: 0.6,
    browDownLeft: 0.3,
    browOuterUpRight: 0.5,
  },
  skeptical: {
    ...DEFAULT_EXPRESSION,
    browOuterUpLeft: 0.7,
    browDownRight: 0.3,
    mouthFrown: 0.2,
    headRoll: -0.05,
  },
  shocked: {
    ...DEFAULT_EXPRESSION,
    mouthOpen: 0.7,
    eyeWideLeft: 0.8,
    eyeWideRight: 0.8,
    browInnerUp: 0.9,
    browOuterUpLeft: 0.6,
    browOuterUpRight: 0.6,
  },
  mocking: {
    ...DEFAULT_EXPRESSION,
    mouthOpen: 0.3,
    mouthSmileLeft: 0.4,
    mouthSmileRight: 0.4,
    eyeBlinkLeft: 0.4,
    browOuterUpLeft: 0.5,
    browOuterUpRight: 0.5,
    headYaw: 0.08,
  },
  intense_stare: {
    ...DEFAULT_EXPRESSION,
    eyeWideLeft: 0.5,
    eyeWideRight: 0.5,
    browDownLeft: 0.4,
    browDownRight: 0.4,
    headPitch: -0.03,
  },
  silly: {
    ...DEFAULT_EXPRESSION,
    mouthOpen: 0.5,
    mouthPucker: 0.3,
    eyeBlinkLeft: 0.7,
    browInnerUp: 0.6,
    browOuterUpRight: 0.8,
    headRoll: 0.1,
    headYaw: 0.06,
    cheekPuff: 0.4,
  },
  wink: {
    ...DEFAULT_EXPRESSION,
    eyeBlinkRight: 0.95,
    mouthSmileLeft: 0.5,
    mouthSmileRight: 0.3,
    browOuterUpLeft: 0.4,
  },
  disappointed: {
    ...DEFAULT_EXPRESSION,
    mouthFrown: 0.5,
    browInnerUp: 0.4,
    eyeBlinkLeft: 0.2,
    eyeBlinkRight: 0.2,
    headPitch: 0.05,
  },
  laughing: {
    ...DEFAULT_EXPRESSION,
    mouthOpen: 0.6,
    mouthSmileLeft: 0.9,
    mouthSmileRight: 0.9,
    eyeBlinkLeft: 0.5,
    eyeBlinkRight: 0.5,
    cheekPuff: 0.2,
    browInnerUp: 0.3,
  },
  unimpressed: {
    ...DEFAULT_EXPRESSION,
    eyeBlinkLeft: 0.3,
    eyeBlinkRight: 0.3,
    browDownLeft: 0.3,
    browDownRight: 0.3,
    mouthFrown: 0.15,
    headYaw: -0.04,
  },
  big_smile: {
    ...DEFAULT_EXPRESSION,
    mouthSmileLeft: 0.9,
    mouthSmileRight: 0.9,
    mouthOpen: 0.2,
    eyeBlinkLeft: 0.2,
    eyeBlinkRight: 0.2,
    cheekPuff: 0.15,
    browInnerUp: 0.2,
  },
  puckered: {
    ...DEFAULT_EXPRESSION,
    mouthPucker: 0.8,
    browInnerUp: 0.3,
    eyeWideLeft: 0.3,
    eyeWideRight: 0.3,
  },
  angry_brow: {
    ...DEFAULT_EXPRESSION,
    browDownLeft: 0.7,
    browDownRight: 0.7,
    eyeWideLeft: 0.3,
    eyeWideRight: 0.3,
    mouthFrown: 0.3,
    headPitch: -0.04,
  },
};

/** Taunt lines organized by context */
const TAUNTS = {
  staring_contest: {
    start: ['STARING CONTEST. DON\'T BLINK.', 'EYES ON ME. NO BLINKING.', 'LET\'S SEE THOSE EYES.'],
    win: ['HA. YOU BLINKED.', 'WEAK. I SAW THAT BLINK.', 'PATHETIC. TRY AGAIN.', 'TOO EASY.'],
    holding: ['STILL GOING...', 'IMPRESSIVE... FOR A HUMAN.', 'YOUR EYES MUST HURT.', 'HOW LONG CAN YOU LAST?'],
  },
  dont_smile: {
    start: ['DON\'T SMILE.', 'WHATEVER YOU DO... DON\'T SMILE.', 'BET YOU CAN\'T KEEP A STRAIGHT FACE.'],
    fail: ['HA! YOU SMILED!', 'CAUGHT YOU!', 'I SAW THAT GRIN.', 'YOU LOSE.', 'CAN\'T HELP YOURSELF, CAN YOU?'],
    holding: ['NOTHING FUNNY HERE...', 'KEEP IT TOGETHER...', 'BORING, ISN\'T IT?', 'SO SERIOUS...'],
    provoke: ['THINK ABOUT SOMETHING FUNNY.', '*STARES HARDER*', 'YOUR FACE IS TWITCHING...', 'ALMOST...'],
  },
  copy_me: {
    start: ['COPY THIS FACE.', 'MATCH MY EXPRESSION.', 'DO WHAT I DO.'],
    success: ['NOT BAD.', 'ACCEPTABLE.', 'CLOSE ENOUGH, I GUESS.', 'FINE. YOU WIN THIS ONE.'],
    fail: ['THAT\'S NOT EVEN CLOSE.', 'ARE YOU EVEN TRYING?', 'WRONG.', 'TERRIBLE IMPRESSION.'],
  },
  react: {
    surprised: ['OH? SOMETHING SURPRISED YOU?', 'WHAT\'S WITH THAT FACE?', 'INTERESTING REACTION.'],
    smile: ['WHAT ARE YOU SMILING ABOUT?', 'SOMETHING FUNNY?', 'DON\'T LOOK SO SMUG.'],
    neutral: ['SO BORING.', 'GIVE ME SOMETHING TO WORK WITH.', 'HELLO? ANYONE HOME?', 'WAKE UP.'],
    mouth: ['CLOSE YOUR MOUTH.', 'WHAT ARE YOU, A FISH?', 'CATCHING FLIES?'],
  },
  judging: {
    lines: ['HMMMM...', 'INTERESTING.', 'I SEE.', 'NOTED.', 'FASCINATING.', 'REALLY?', 'TELL ME MORE... WITH YOUR FACE.'],
  },
  idle: {
    bored: ['HEY.', 'I\'M WAITING.', 'DO SOMETHING.', 'BORED YET?', '*TAPS GLASS*', 'HELLO?'],
  },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickExpression(name: keyof typeof EXPRESSIONS): ExpressionState {
  return { ...EXPRESSIONS[name] };
}

/**
 * The Behavior Engine — the avatar's brain.
 * Instead of mirroring, it watches the user and decides how to react & provoke.
 */
export class BehaviorEngine {
  private mode: BehaviorMode = 'idle';
  private modeTimer = 0;
  private modeDuration = 0;
  private targetExpr: ExpressionState = { ...DEFAULT_EXPRESSION };
  private currentExpr: ExpressionState = { ...DEFAULT_EXPRESSION };
  private displayText = '';
  private subText = '';
  private energy = 0.5;
  private flashColor: string | null = null;
  private flashTimer = 0;
  private score = 0;
  private streak = 0;
  private frame = 0;
  private idleTimer = 0;
  private lastUserActivity = 0;
  private challengeScore = 0;
  private expressionHoldTimer = 0;
  private copyTargetExpr: ExpressionState = { ...DEFAULT_EXPRESSION };
  private copyTargetName = '';
  private blinkDetected = false;
  private smileDetected = false;

  /** Modes the engine can cycle through, weighted by fun factor */
  private readonly MODE_POOL: { mode: BehaviorMode; weight: number }[] = [
    { mode: 'staring_contest', weight: 3 },
    { mode: 'dont_smile', weight: 4 },
    { mode: 'copy_me', weight: 2 },
    { mode: 'judging', weight: 2 },
    { mode: 'react', weight: 3 },
  ];

  update(userExpr: ExpressionState): BehaviorOutput {
    this.frame++;
    this.modeTimer++;
    this.flashTimer = Math.max(0, this.flashTimer - 1);
    if (this.flashTimer === 0) this.flashColor = null;

    // Detect user activity
    const userSmile = (userExpr.mouthSmileLeft + userExpr.mouthSmileRight) / 2;
    const userBlink = Math.max(userExpr.eyeBlinkLeft, userExpr.eyeBlinkRight);
    const userMouthOpen = userExpr.mouthOpen;
    const userBrowUp = userExpr.browInnerUp + (userExpr.browOuterUpLeft + userExpr.browOuterUpRight) / 2;
    const userActivity = userSmile + userBlink * 0.5 + userMouthOpen + userBrowUp * 0.3;

    if (userActivity > 0.3) {
      this.lastUserActivity = this.frame;
      this.idleTimer = 0;
    } else {
      this.idleTimer++;
    }

    // Run mode-specific logic
    switch (this.mode) {
      case 'idle':
        this.updateIdle(userExpr, userActivity);
        break;
      case 'staring_contest':
        this.updateStaringContest(userExpr, userBlink);
        break;
      case 'dont_smile':
        this.updateDontSmile(userExpr, userSmile);
        break;
      case 'copy_me':
        this.updateCopyMe(userExpr);
        break;
      case 'react':
        this.updateReact(userExpr, userSmile, userMouthOpen, userBrowUp);
        break;
      case 'judging':
        this.updateJudging(userExpr);
        break;
      case 'taunt':
        this.updateTaunt();
        break;
    }

    // Check if it's time to switch modes
    if (this.modeTimer > this.modeDuration && this.mode !== 'idle') {
      this.transitionToNextMode();
    }

    // Smooth the avatar's expression
    for (const key of Object.keys(this.currentExpr) as (keyof ExpressionState)[]) {
      this.currentExpr[key] = lerp(this.currentExpr[key], this.targetExpr[key], 0.08);
    }

    // Add subtle idle animation layered on top
    const breathe = Math.sin(this.frame * 0.02) * 0.01;
    const fidget = Math.sin(this.frame * 0.007) * 0.02;

    const finalExpr = { ...this.currentExpr };
    finalExpr.headPitch += breathe;
    finalExpr.headYaw += fidget;

    return {
      avatarExpression: finalExpr,
      mode: this.mode,
      displayText: this.displayText,
      subText: this.subText,
      energy: this.energy,
      flashColor: this.flashTimer > 0 ? this.flashColor : null,
    };
  }

  private updateIdle(userExpr: ExpressionState, userActivity: number) {
    this.modeDuration = 180; // ~3 sec at 60fps then switch

    // Avatar looks around lazily, occasionally looks at user
    if (this.modeTimer % 120 < 60) {
      this.targetExpr = pickExpression('unimpressed');
    } else {
      this.targetExpr = pickExpression('neutral');
      this.targetExpr.headYaw = Math.sin(this.frame * 0.01) * 0.06;
    }

    if (this.idleTimer > 300) {
      this.displayText = pick(TAUNTS.idle.bored);
      this.energy = 0.3;
    } else {
      this.displayText = '';
      this.energy = 0.4;
    }

    this.subText = this.score > 0 ? `SCORE: ${this.score}` : '';

    // If user does something interesting, react immediately
    if (userActivity > 0.4) {
      this.switchMode('react');
      return;
    }

    // Auto-transition to a challenge after idle
    if (this.modeTimer > this.modeDuration) {
      this.transitionToNextMode();
    }
  }

  private updateStaringContest(userExpr: ExpressionState, userBlink: number) {
    this.modeDuration = 600; // 10 seconds

    // Avatar stares intensely
    this.targetExpr = pickExpression('intense_stare');
    // Slight head movement to be unsettling
    this.targetExpr.headYaw = Math.sin(this.frame * 0.015) * 0.02;
    this.targetExpr.headPitch = Math.sin(this.frame * 0.01) * 0.01;
    this.energy = 0.7 + Math.sin(this.frame * 0.05) * 0.1;

    if (this.modeTimer < 60) {
      this.displayText = pick(TAUNTS.staring_contest.start);
      this.blinkDetected = false;
      this.challengeScore = 0;
    } else if (userBlink > 0.6 && !this.blinkDetected) {
      // User blinked — GOTCHA
      this.blinkDetected = true;
      this.displayText = pick(TAUNTS.staring_contest.win);
      this.targetExpr = pickExpression('mocking');
      this.flash('#ff2d8a');
      this.energy = 1.0;
      this.score = Math.max(0, this.score - 1);
      // End challenge soon
      this.modeDuration = this.modeTimer + 120;
    } else if (!this.blinkDetected) {
      this.challengeScore++;
      if (this.challengeScore % 120 === 0) {
        this.displayText = pick(TAUNTS.staring_contest.holding);
      }
      const elapsed = Math.floor(this.modeTimer / 60);
      this.subText = `${elapsed}s — DON'T BLINK`;
    }

    // User survived the whole duration
    if (this.modeTimer >= this.modeDuration - 30 && !this.blinkDetected) {
      this.displayText = 'IMPRESSIVE. YOU WIN THIS ONE.';
      this.targetExpr = pickExpression('disappointed');
      this.score += 3;
      this.streak++;
      this.flash('#00ffcc');
    }
  }

  private updateDontSmile(userExpr: ExpressionState, userSmile: number) {
    this.modeDuration = 600; // 10 seconds

    if (this.modeTimer < 60) {
      this.displayText = pick(TAUNTS.dont_smile.start);
      this.targetExpr = pickExpression('neutral');
      this.smileDetected = false;
      this.energy = 0.5;
    } else if (userSmile > 0.25 && !this.smileDetected) {
      // USER SMILED — CAUGHT!
      this.smileDetected = true;
      this.displayText = pick(TAUNTS.dont_smile.fail);
      this.targetExpr = pickExpression('laughing');
      this.flash('#ff00ff');
      this.energy = 1.0;
      this.score = Math.max(0, this.score - 1);
      this.streak = 0;
      this.modeDuration = this.modeTimer + 120;
    } else if (!this.smileDetected) {
      // Provoke the user — cycle through silly expressions
      const phase = Math.floor((this.modeTimer - 60) / 90) % 6;
      switch (phase) {
        case 0: this.targetExpr = pickExpression('silly'); break;
        case 1: this.targetExpr = pickExpression('wink'); break;
        case 2: this.targetExpr = pickExpression('puckered'); break;
        case 3: this.targetExpr = pickExpression('shocked'); break;
        case 4: this.targetExpr = pickExpression('big_smile'); break;
        case 5:
          this.targetExpr = pickExpression('silly');
          this.targetExpr.headRoll = -0.1;
          this.targetExpr.headYaw = -0.06;
          break;
      }

      if (this.modeTimer % 90 === 0) {
        this.displayText = pick([...TAUNTS.dont_smile.holding, ...TAUNTS.dont_smile.provoke]);
      }

      this.energy = 0.5 + (this.modeTimer / this.modeDuration) * 0.3;
      this.subText = 'KEEP A STRAIGHT FACE';
    }

    // User survived
    if (this.modeTimer >= this.modeDuration - 30 && !this.smileDetected) {
      this.displayText = 'STONE COLD. RESPECT.';
      this.targetExpr = pickExpression('skeptical');
      this.score += 3;
      this.streak++;
      this.flash('#00ffcc');
    }
  }

  private updateCopyMe(userExpr: ExpressionState) {
    this.modeDuration = 480; // 8 seconds

    if (this.modeTimer < 60) {
      // Pick a random expression for user to copy
      const options: (keyof typeof EXPRESSIONS)[] = ['shocked', 'smirk', 'puckered', 'angry_brow', 'big_smile', 'wink'];
      this.copyTargetName = pick(options);
      this.copyTargetExpr = pickExpression(this.copyTargetName as keyof typeof EXPRESSIONS);
      this.targetExpr = this.copyTargetExpr;
      this.displayText = pick(TAUNTS.copy_me.start);
      this.energy = 0.6;
    } else {
      this.targetExpr = this.copyTargetExpr;
      const similarity = this.computeSimilarity(userExpr, this.copyTargetExpr);

      if (similarity > 0.35) {
        this.displayText = pick(TAUNTS.copy_me.success);
        this.targetExpr = pickExpression('big_smile');
        this.score += 2;
        this.streak++;
        this.flash('#00ffcc');
        this.modeDuration = this.modeTimer + 90;
      } else if (this.modeTimer > this.modeDuration - 60) {
        this.displayText = pick(TAUNTS.copy_me.fail);
        this.targetExpr = pickExpression('disappointed');
        this.streak = 0;
      } else {
        const pct = Math.floor(similarity * 100);
        this.subText = `MATCH: ${pct}%`;
        this.energy = 0.5 + similarity * 0.3;
      }
    }
  }

  private updateReact(
    userExpr: ExpressionState,
    userSmile: number,
    userMouthOpen: number,
    userBrowUp: number
  ) {
    this.modeDuration = 300; // 5 seconds

    if (userSmile > 0.3) {
      // User is smiling — be skeptical/suspicious
      this.targetExpr = pickExpression('skeptical');
      if (this.modeTimer % 100 === 0) {
        this.displayText = pick(TAUNTS.react.smile);
      }
      this.energy = 0.6;
    } else if (userMouthOpen > 0.3) {
      // User has mouth open — mock them
      this.targetExpr = pickExpression('shocked');
      if (this.modeTimer % 100 === 0) {
        this.displayText = pick(TAUNTS.react.mouth);
      }
      this.energy = 0.6;
    } else if (userBrowUp > 0.5) {
      // User surprised — look unimpressed
      this.targetExpr = pickExpression('unimpressed');
      if (this.modeTimer % 100 === 0) {
        this.displayText = pick(TAUNTS.react.surprised);
      }
      this.energy = 0.5;
    } else {
      // User is neutral — be bored
      this.targetExpr = pickExpression('unimpressed');
      if (this.modeTimer % 100 === 0) {
        this.displayText = pick(TAUNTS.react.neutral);
      }
      this.energy = 0.4;
    }

    this.subText = this.score > 0 ? `SCORE: ${this.score}` : '';
  }

  private updateJudging(userExpr: ExpressionState) {
    this.modeDuration = 360; // 6 seconds

    // Slowly look the user up and down
    const phase = (this.modeTimer % 240) / 240;
    this.targetExpr = pickExpression('skeptical');
    this.targetExpr.headPitch = Math.sin(phase * Math.PI * 2) * 0.06;
    this.targetExpr.headYaw = Math.sin(phase * Math.PI) * 0.04;

    // Occasional eyebrow raise
    if (this.modeTimer % 80 < 20) {
      this.targetExpr.browOuterUpLeft = 0.8;
    }

    if (this.modeTimer % 120 === 0) {
      this.displayText = pick(TAUNTS.judging.lines);
    }

    this.energy = 0.5;
    this.subText = '';
  }

  private updateTaunt() {
    this.modeDuration = 120; // 2 seconds
    this.targetExpr = pickExpression('mocking');
    this.energy = 0.8;
  }

  private computeSimilarity(a: ExpressionState, b: ExpressionState): number {
    // Compare key expression values
    const keys: (keyof ExpressionState)[] = [
      'mouthOpen', 'mouthSmileLeft', 'mouthSmileRight', 'mouthPucker',
      'eyeBlinkLeft', 'eyeBlinkRight', 'eyeWideLeft', 'eyeWideRight',
      'browInnerUp', 'browDownLeft', 'browDownRight',
      'browOuterUpLeft', 'browOuterUpRight', 'cheekPuff',
    ];
    let totalDiff = 0;
    for (const key of keys) {
      totalDiff += Math.abs(a[key] - b[key]);
    }
    const avgDiff = totalDiff / keys.length;
    return clamp(1 - avgDiff * 2, 0, 1);
  }

  private switchMode(mode: BehaviorMode) {
    this.mode = mode;
    this.modeTimer = 0;
    this.blinkDetected = false;
    this.smileDetected = false;
    this.challengeScore = 0;
  }

  private transitionToNextMode() {
    // Weighted random selection, avoiding the current mode
    const available = this.MODE_POOL.filter(m => m.mode !== this.mode);
    const totalWeight = available.reduce((sum, m) => sum + m.weight, 0);
    let r = Math.random() * totalWeight;
    for (const entry of available) {
      r -= entry.weight;
      if (r <= 0) {
        this.switchMode(entry.mode);
        return;
      }
    }
    this.switchMode(available[0].mode);
  }

  private flash(color: string) {
    this.flashColor = color;
    this.flashTimer = 20;
  }
}
