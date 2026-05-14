import { Component, type ReactNode } from "react";
import { SiteLayout } from "@/components/layout/SiteLayout";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Vercel captures console.error into function logs.
    console.error("Unhandled render error:", error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <SiteLayout>
        <section className="container-dmvt section-pad text-center">
          <p className="label-caps text-red">Something went wrong</p>
          <h1 className="mt-4 font-display text-4xl font-black text-navy md:text-6xl">
            Unexpected Error
          </h1>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Something broke on our end. Try refreshing — if it keeps happening,
            contact us at contact@dmvthrowers.club.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => this.setState({ error: null })}
              className="label-caps inline-flex bg-red px-6 py-3 text-cream hover:bg-red-dark"
            >
              Try again
            </button>
            <a
              href="/"
              className="label-caps inline-flex border-2 border-navy px-6 py-3 text-navy hover:bg-navy hover:text-cream"
            >
              Go home
            </a>
          </div>
          {import.meta.env.DEV && (
            <pre className="mx-auto mt-8 max-w-2xl overflow-auto rounded border border-hairline bg-cream-mid p-4 text-left text-xs text-navy/70">
              {error.stack ?? error.message}
            </pre>
          )}
        </section>
      </SiteLayout>
    );
  }
}
