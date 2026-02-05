import '@testing-library/jest-dom';

declare global {
  namespace Vi {
    interface JestAssertion<T = unknown> {
      toBeInTheDocument(): T;
      toHaveTextContent(text: string | RegExp): T;
      toBeVisible(): T;
      toBeDisabled(): T;
      toBeEnabled(): T;
      toHaveClass(...classNames: string[]): T;
      toHaveAttribute(attr: string, value?: string): T;
      toHaveValue(value: string | string[] | number): T;
    }
  }
}

export {};
