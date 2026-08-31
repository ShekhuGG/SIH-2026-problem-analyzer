'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  GripVertical,
  Info,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import datasetJson from '@/data/sih-analysis.json';
import type { Dataset, Problem } from '@/data/types';

const dataset = datasetJson as Dataset;
const IMPORTANCE = 'Importance';
const ALL_COLUMNS = [IMPORTANCE, ...dataset.tags];
const STORAGE_KEY = 'sih-problem-explorer:v1';

type PersistedState = {
  selectedColumns?: string[];
  rowOrder?: string[];
  sortActive?: boolean;
};

function metricValue(problem: Problem, column: string) {
  return column === IMPORTANCE ? problem.importance : (problem.tags[column] ?? 0);
}

function validColumns(columns: unknown): string[] {
  if (!Array.isArray(columns)) return [];
  return columns.filter(
    (column): column is string => typeof column === 'string' && ALL_COLUMNS.includes(column),
  ).filter((column, index, values) => values.indexOf(column) === index);
}

export default function ProblemAnalyzer() {
  const originalOrder = useMemo(() => dataset.problems.map((problem) => problem.id), []);
  const originalIndex = useMemo(
    () => new Map(originalOrder.map((id, index) => [id, index])),
    [originalOrder],
  );
  const problemsById = useMemo(
    () => new Map(dataset.problems.map((problem) => [problem.id, problem])),
    [],
  );

  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [rowOrder, setRowOrder] = useState<string[]>(originalOrder);
  const [sortActive, setSortActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openProblem, setOpenProblem] = useState<Problem | null>(null);
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as PersistedState;
        const columns = validColumns(saved.selectedColumns);
        const savedOrder = Array.isArray(saved.rowOrder)
          ? saved.rowOrder.filter((id): id is string => typeof id === 'string' && problemsById.has(id))
          : [];
        setSelectedColumns(columns);
        if (savedOrder.length === originalOrder.length && new Set(savedOrder).size === originalOrder.length) {
          setRowOrder(savedOrder);
        }
        setSortActive(Boolean(saved.sortActive && columns.length));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, [originalOrder, problemsById]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ selectedColumns, rowOrder, sortActive }),
    );
  }, [hydrated, rowOrder, selectedColumns, sortActive]);

  const visibleProblems = useMemo(() => {
    const tokens = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return rowOrder
      .map((id) => problemsById.get(id))
      .filter((problem): problem is Problem => Boolean(problem))
      .filter((problem) => {
        if (!tokens.length) return true;
        const searchable = [
          problem.title,
          problem.statement,
          problem.organization,
          problem.department,
          problem.category,
          problem.theme,
          problem.keywords.join(' '),
          Object.entries(problem.tags)
            .filter(([, value]) => value > 0)
            .map(([tag]) => tag)
            .join(' '),
        ].join(' ').toLowerCase();
        return tokens.every((token) => searchable.includes(token));
      });
  }, [problemsById, rowOrder, searchQuery]);

  const unusedColumns = ALL_COLUMNS.filter((column) => !selectedColumns.includes(column));
  const orderChanged = rowOrder.some((id, index) => id !== originalOrder[index]);

  function markColumnsDirty(nextColumns: string[]) {
    setSelectedColumns(nextColumns);
    setSortActive(false);
  }

  function addColumn(column: string) {
    if (!ALL_COLUMNS.includes(column) || selectedColumns.includes(column)) return;
    markColumnsDirty([...selectedColumns, column]);
  }

  function removeColumn(column: string) {
    markColumnsDirty(selectedColumns.filter((selected) => selected !== column));
  }

  function toggleColumn(column: string) {
    selectedColumns.includes(column) ? removeColumn(column) : addColumn(column);
  }

  function moveColumn(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= selectedColumns.length) return;
    const next = [...selectedColumns];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    markColumnsDirty(next);
  }

  function sortRows() {
    if (!selectedColumns.length) return;
    const next = [...dataset.problems].sort((left, right) => {
      for (const column of selectedColumns) {
        const difference = metricValue(right, column) - metricValue(left, column);
        if (difference !== 0) return difference;
      }
      return (originalIndex.get(left.id) ?? 0) - (originalIndex.get(right.id) ?? 0);
    });
    setRowOrder(next.map((problem) => problem.id));
    setSortActive(true);
  }

  function resetOrder() {
    setRowOrder(originalOrder);
    setSortActive(false);
  }

  function dropColumn(targetColumn: string) {
    if (!draggingColumn || draggingColumn === targetColumn) return;
    moveColumn(selectedColumns.indexOf(draggingColumn), selectedColumns.indexOf(targetColumn));
    setDraggingColumn(null);
  }

  return (
    <main className="min-h-screen bg-background px-4 py-4 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1760px]">
        <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Smart India Hackathon 2026</p>
            <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.035em]">BroDev Problem Analyzer</h1>
          </div>
          <div className="flex max-w-3xl items-start gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs leading-5 text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <p>Choose capabilities, add them as columns, arrange priority left-to-right, then press <strong className="font-medium text-foreground">Sort</strong>. Open any problem for a concise recommended MVP approach.</p>
          </div>
        </header>

        <section className="py-3" aria-labelledby="capability-heading">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 id="capability-heading" className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Available columns</h2>
            <span className="font-mono text-[10px] text-muted-foreground">{selectedColumns.length}/{ALL_COLUMNS.length} selected</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_COLUMNS.map((column) => {
              const selected = selectedColumns.includes(column);
              return (
                <button
                  key={column}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleColumn(column)}
                  className={`inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${selected ? 'border-primary/35 bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground'}`}
                  data-selected={selected || undefined}
                >
                  {selected && <Check className="size-3" />}
                  {column}
                </button>
              );
            })}
          </div>
        </section>

        <section className="border-t border-border pt-3" aria-label="Problem statement comparison table">
          <div className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <div className="relative w-full max-w-md">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search problem statements"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search title, statement, theme, domain…"
                  className="h-8 bg-card pl-8 pr-8"
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">{visibleProblems.length} of {dataset.problems.length}</span>
            </div>

            <div className="flex min-w-0 items-center gap-2">
              <p className="min-w-0 truncate text-[10px] text-muted-foreground">
                {sortActive && selectedColumns.length ? (
                  <>Sorted by: <span className="text-foreground">{selectedColumns.map((column) => `${column} ↓`).join(' → ')}</span></>
                ) : selectedColumns.length ? (
                  <>Priority ready: <span className="text-foreground">{selectedColumns.join(' → ')}</span> · press Sort to apply</>
                ) : (
                  'Original dataset order'
                )}
              </p>
              {(sortActive || orderChanged) && (
                <Button variant="ghost" size="sm" onClick={resetOrder}>Reset order</Button>
              )}
              <Button size="sm" onClick={sortRows} disabled={!selectedColumns.length} className="px-3 shadow-sm">
                <ArrowDownWideNarrow /> Sort
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_10px_30px_rgb(18_45_60/5%)]">
            <Table className="min-w-max table-fixed">
              <TableHeader className="bg-muted/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky left-0 top-0 z-30 h-10 w-[min(54vw,720px)] min-w-[520px] border-r border-border bg-muted px-3 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                    Problem statement
                  </TableHead>
                  {selectedColumns.map((column, index) => (
                    <TableHead
                      key={column}
                      draggable
                      onDragStart={() => setDraggingColumn(column)}
                      onDragEnd={() => setDraggingColumn(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => dropColumn(column)}
                      className="group/header sticky top-0 z-20 h-10 w-[156px] min-w-[156px] border-r border-border bg-muted px-1.5"
                      data-dragging={draggingColumn === column || undefined}
                    >
                      <div className="flex items-center gap-1">
                        <GripVertical className="size-3 cursor-grab text-muted-foreground/60" />
                        <span className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[8px] text-primary">P{index + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-foreground">{column}</span>
                        <div className="flex opacity-0 transition-opacity group-hover/header:opacity-100 group-focus-within/header:opacity-100">
                          <button type="button" disabled={index === 0} onClick={() => moveColumn(index, index - 1)} aria-label={`Move ${column} left`} className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-25"><ChevronLeft className="size-3" /></button>
                          <button type="button" disabled={index === selectedColumns.length - 1} onClick={() => moveColumn(index, index + 1)} aria-label={`Move ${column} right`} className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground disabled:opacity-25"><ChevronRight className="size-3" /></button>
                          <button type="button" onClick={() => removeColumn(column)} aria-label={`Remove ${column}`} className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-destructive"><X className="size-3" /></button>
                        </div>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="sticky top-0 z-20 h-10 w-11 min-w-11 bg-muted px-2 text-center">
                    {unusedColumns.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button aria-label="Add comparison column" variant="ghost" size="icon-xs" />}>
                          <Plus />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Add priority column</DropdownMenuLabel>
                          {unusedColumns.map((column) => (
                            <DropdownMenuItem key={column} onClick={() => addColumn(column)}>{column}</DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleProblems.map((problem, index) => (
                  <TableRow key={problem.id} className="group/row">
                    <TableCell className="sticky left-0 z-20 h-12 w-[min(54vw,720px)] min-w-[520px] border-r border-border bg-card px-3 py-1.5 whitespace-normal group-hover/row:bg-muted/45">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 w-7 shrink-0 text-right font-mono text-[9px] tabular-nums text-muted-foreground">{String(index + 1).padStart(3, '0')}</span>
                        <button type="button" onClick={() => setOpenProblem(problem)} className="line-clamp-2 text-left text-[12px] font-medium leading-[17px] text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:underline">
                          {problem.title}
                          <span className="ml-2 font-mono text-[9px] font-normal text-muted-foreground">{problem.id}</span>
                        </button>
                      </div>
                    </TableCell>
                    {selectedColumns.map((column) => (
                      <TableCell key={column} className="w-[156px] min-w-[156px] border-r border-border px-3 py-1.5 text-right font-mono text-[11px] tabular-nums">
                        <span className="font-semibold text-foreground">{metricValue(problem, column).toFixed(column === IMPORTANCE ? 1 : 0)}</span>
                        <span className="ml-1 text-[9px] text-muted-foreground">{column === IMPORTANCE ? '/10' : '%'}</span>
                      </TableCell>
                    ))}
                    <TableCell className="w-11 min-w-11" />
                  </TableRow>
                ))}
                {visibleProblems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={selectedColumns.length + 2} className="h-32 text-center text-sm text-muted-foreground">No problem statements match “{searchQuery}”.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>

      <Dialog open={Boolean(openProblem)} onOpenChange={(open) => !open && setOpenProblem(null)}>
        {openProblem && (
          <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-4xl">
            <DialogHeader className="border-b border-border px-5 py-4 pr-12">
              <div className="mb-1 flex flex-wrap items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                <span>{openProblem.id}</span><span>·</span><span>{openProblem.category}</span><span>·</span><span>{openProblem.theme}</span>
              </div>
              <DialogTitle className="text-lg leading-6 tracking-[-0.02em]">{openProblem.title}</DialogTitle>
              <DialogDescription className="max-w-3xl text-xs leading-5">{openProblem.approach.summary}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-5 pb-5">
              <section aria-labelledby="workflow-title">
                <h3 id="workflow-title" className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Recommended workflow</h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  {openProblem.approach.flow.map((step, index) => (
                    <div key={`${step}-${index}`} className="contents">
                      <div className="rounded-md border border-border bg-muted/50 px-2.5 py-2 text-[10px] font-medium leading-4">{step}</div>
                      {index < openProblem.approach.flow.length - 1 && <ChevronRight className="size-3.5 shrink-0 text-primary/60" />}
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2" aria-label="MVP implementation details">
                {[
                  ['Core approach', openProblem.approach.details.coreApproach],
                  ['Main technologies', openProblem.approach.details.mainTechnologies],
                  ['Key algorithm / model', openProblem.approach.details.keyAlgorithm],
                  ['Important challenge', openProblem.approach.details.technicalChallenge],
                  ['MVP implementation', openProblem.approach.details.mvp],
                ].map(([label, value], index) => (
                  <div key={label} className={`bg-card p-3 ${index === 4 ? 'sm:col-span-2' : ''}`}>
                    <h3 className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</h3>
                    <p className="mt-1 text-xs leading-5">{value}</p>
                  </div>
                ))}
              </section>

              <details className="group rounded-md border border-border bg-muted/25">
                <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-medium">Original SIH problem statement</summary>
                <div className="border-t border-border px-3 py-3">
                  <p className="max-h-56 overflow-y-auto whitespace-pre-wrap pr-2 text-[11px] leading-5 text-muted-foreground">{openProblem.statement}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px]">
                    <span className="text-muted-foreground">{openProblem.organization}</span>
                    <a href={openProblem.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">Open SIH source <ExternalLink className="size-3" /></a>
                    {openProblem.datasetUrl && <a href={openProblem.datasetUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">Dataset <ExternalLink className="size-3" /></a>}
                  </div>
                </div>
              </details>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </main>
  );
}
