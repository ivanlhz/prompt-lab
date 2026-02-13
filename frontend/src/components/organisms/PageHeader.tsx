interface Props {
  title: string;
  description?: string;
  /** Contenido a la izquierda (p. ej. botón Back) */
  leftContent?: React.ReactNode;
  /** Contenido a la derecha (acciones) */
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  description,
  leftContent,
  children,
}: Props) {
  return (
    <header className="sticky top-0 z-[1] flex items-center gap-4 border-b border-app-border bg-app-bg/95 px-6 py-4 backdrop-blur">
      {leftContent}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-semibold text-app-text">{title}</h1>
        {description && (
          <p className="truncate text-sm text-app-subtext">{description}</p>
        )}
      </div>
      {children}
    </header>
  );
}
