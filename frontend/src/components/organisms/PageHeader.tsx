/**
 * Compound component: compón explícitamente Left, Title y Actions.
 * Evita props booleanas y deja claro qué se muestra.
 *
 * @example
 * <PageHeader.Root>
 *   <PageHeader.Left><Button>← Back</Button></PageHeader.Left>
 *   <PageHeader.Title title="Experiments" />
 *   <PageHeader.Actions><Button>+ New</Button></PageHeader.Actions>
 * </PageHeader.Root>
 */

const headerClass =
  "sticky top-0 z-[1] flex items-center gap-4 border-b border-app-border bg-app-bg/95 px-6 py-4 backdrop-blur";

function Root({ children }: { children: React.ReactNode }) {
  return <header className={headerClass}>{children}</header>;
}

function Left({ children }: { children: React.ReactNode }) {
  return <div className="shrink-0">{children}</div>;
}

interface TitleProps {
  title: string;
  description?: string;
}

function Title({ title, description }: TitleProps) {
  return (
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-xl font-semibold text-app-text">{title}</h1>
      {description != null && description !== "" ? (
        <p className="truncate text-sm text-app-subtext">{description}</p>
      ) : null}
    </div>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="shrink-0">{children}</div>;
}

export const PageHeader = {
  Root,
  Left,
  Title,
  Actions,
};

export default PageHeader;
