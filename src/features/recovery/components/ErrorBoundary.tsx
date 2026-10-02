import { Component, Fragment, type ErrorInfo, type ReactNode } from "react";
import { describeFailure, type Failure } from "../model";
import { RecoveryScreen } from "./RecoveryScreen";

interface Props {
  children: ReactNode;
}

interface State {
  failure?: Failure;
  /** Cambia en cada reintento: vuelve a montar la app desde cero. */
  attempt: number;
}

/**
 * Atrapa los fallos de React al dibujar. Sin él, uno solo deja la ventana en negro.
 * Es una clase porque React solo ofrece getDerivedStateFromError / componentDidCatch así.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { attempt: 0 };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { failure: describeFailure(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error);
    this.setState({ failure: describeFailure(error, info.componentStack) });
  }

  retry = () => this.setState((s) => ({ failure: undefined, attempt: s.attempt + 1 }));

  render() {
    const { failure, attempt } = this.state;
    if (failure) return <RecoveryScreen failure={failure} onRetry={this.retry} />;
    return <Fragment key={attempt}>{this.props.children}</Fragment>;
  }
}
