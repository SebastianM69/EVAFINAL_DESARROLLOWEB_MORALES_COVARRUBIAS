type StatusBannerProps = {
  message: string;
  tone?: 'success' | 'error' | 'info';
};

export function StatusBanner({ message, tone = 'info' }: StatusBannerProps): React.JSX.Element {
  return <div className={`status-banner status-banner--${tone}`}>{message}</div>;
}
