
export type VisualType = 'secant_slope' | 'tangent_slope' | 'area_under_curve';

export interface Step {
  id: string;
  type: 'observation' | 'incantation' | 'casting' | 'mastery';
  text: string;
  latex?: string; // For math equations
  visual?: VisualType;
  sliderConfig?: {
    label: string;
    min: number;
    max: number;
    default: number;
    step: number;
  };
  question?: string;
  correctAnswer?: string; // Simple string matching for MVP
  hint?: string;
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  steps: Step[];
}

export const CALCULUS_CURRICULUM: Chapter[] = [
  {
    id: 'limits',
    title: 'The Limit',
    description: 'The art of approaching the infinite without touching it.',
    steps: [
      {
        id: 'l1-obs',
        type: 'observation',
        text: 'Behold the curve f(x) = x². We wish to find the slope at point P (x=1). Drag the slider to move point Q closer to P.',
        visual: 'secant_slope',
        sliderConfig: { label: 'Distance (h)', min: 0.01, max: 2, default: 1.5, step: 0.01 }
      },
      {
        id: 'l1-inc',
        type: 'incantation',
        text: 'As the distance (h) shrinks to nothing, the Secant Line (cutting two points) becomes the Tangent Line (touching one point). We call this specific value the "Limit".',
        latex: '\\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}',
        visual: 'secant_slope',
        sliderConfig: { label: 'Distance (h)', min: 0.01, max: 2, default: 0.1, step: 0.01 }
      },
      {
        id: 'l1-cast',
        type: 'casting',
        text: 'If f(x) = x², then f(1) = 1. If we move h=0.1 away, f(1.1) = 1.21. Calculate the "rise over run" (slope) for this small gap.',
        latex: '\\frac{1.21 - 1.0}{0.1} = ?',
        question: 'Enter the slope:',
        correctAnswer: '2.1',
        hint: 'Subtract the y-values (0.21) and divide by h (0.1).'
      }
    ]
  },
  {
    id: 'derivatives',
    title: 'The Derivative',
    description: 'Instantaneous rate of change.',
    steps: [
      {
        id: 'd1-obs',
        type: 'observation',
        text: 'The Derivative is simply the slope of that Tangent line we found earlier. Drag the slider to see how the slope changes as x increases.',
        visual: 'tangent_slope',
        sliderConfig: { label: 'Position (x)', min: -2, max: 2, default: 0, step: 0.1 }
      },
      {
        id: 'd1-inc',
        type: 'incantation',
        text: 'For the curve f(x) = x², the slope is always exactly 2x. This "function of slopes" is denoted as f\'(x).',
        latex: '\\frac{d}{dx}(x^2) = 2x',
        visual: 'tangent_slope',
        sliderConfig: { label: 'Position (x)', min: -2, max: 2, default: 1, step: 0.1 }
      },
      {
        id: 'd1-cast',
        type: 'casting',
        text: 'If the derivative of x² is 2x, what is the slope of the curve at x = 3?',
        latex: 'f\'(3) = 2(3)',
        question: 'Calculate the slope:',
        correctAnswer: '6',
        hint: 'Simply multiply the x-value by 2.'
      }
    ]
  },
  {
    id: 'integrals',
    title: 'The Integral',
    description: 'Accumulation of change over time.',
    steps: [
      {
        id: 'i1-obs',
        type: 'observation',
        text: 'Differentiation cuts things up. Integration adds them back together. It is the area under the curve. Drag to add more rectangles (Riemann Sums).',
        visual: 'area_under_curve',
        sliderConfig: { label: 'Precision (N)', min: 1, max: 20, default: 4, step: 1 }
      },
      {
        id: 'i1-inc',
        type: 'incantation',
        text: 'As the number of rectangles approaches infinity, the jagged approximation becomes the smooth exact area.',
        latex: '\\int_{a}^{b} f(x) dx',
        visual: 'area_under_curve',
        sliderConfig: { label: 'Precision (N)', min: 1, max: 50, default: 20, step: 1 }
      },
      {
        id: 'i1-cast',
        type: 'casting',
        text: 'The integral of 2x is x². Calculate the area under f(x)=2x from x=0 to x=3.',
        latex: '[x^2]_0^3 = 3^2 - 0^2',
        question: 'Enter the area:',
        correctAnswer: '9',
        hint: 'Square the upper bound (3) and subtract the square of the lower bound (0).'
      }
    ]
  }
];
