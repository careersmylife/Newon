import type React from 'react';

export enum BookingStep {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING_DPW = 'LISTENING_DPW',
  CONFIRMING_DPW = 'CONFIRMING_DPW',
  LISTENING_TOKEN = 'LISTENING_TOKEN',
  CONFIRMING_TOKEN = 'CONFIRMING_TOKEN',
  CONFIRMING_BOOKING = 'CONFIRMING_BOOKING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

// FIX: Add global JSX intrinsic element type definitions to fix widespread 'Property does not exist on type JSX.IntrinsicElements' errors.
// This seems to be necessary due to a project configuration issue where React's default JSX types are not being loaded correctly.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      svg: React.SVGProps<SVGSVGElement>;
      path: React.SVGProps<SVGPathElement>;
      circle: React.SVGProps<SVGCircleElement>;
      animateTransform: React.SVGProps<SVGAnimateTransformElement>;
      img: React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>;
      div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
      span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
      header: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      h1: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      main: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
      p: React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
      button: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
      h2: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      // FIX: Add h3 to IntrinsicElements to fix type error in App.tsx.
      h3: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      form: React.DetailedHTMLProps<React.FormHTMLAttributes<HTMLFormElement>, HTMLFormElement>;
      input: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
    }
  }
}
