import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React Component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center dir-rtl" dir="rtl">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-base font-extrabold text-slate-900 mb-2">
            حدث خطأ أثناء عرض الشاشة (Runtime Render Error)
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed dir-ltr font-mono bg-slate-100 p-3 rounded-xl border border-slate-200 overflow-x-auto text-left">
            {this.state.error?.message || 'Unknown render exception'}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            إعادة تحميل الصفحة
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
