import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichAnmeldungen } from '@/lib/enrich';
import type { Kurse, Hunde, Anmeldungen } from '@/types/app';
import type { EnrichedAnmeldungen } from '@/types/enriched';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate, formatCurrency } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { KurseDialog } from '@/components/dialogs/KurseDialog';
import { HundeDialog } from '@/components/dialogs/HundeDialog';
import { AnmeldungenDialog } from '@/components/dialogs/AnmeldungenDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconUsers, IconBook,
  IconDog, IconClock, IconMapPin, IconCurrencyEuro, IconChevronDown, IconChevronUp,
} from '@tabler/icons-react';

const APPGROUP_ID = '6ac126472b4b484abd7cccb2';
const REPAIR_ENDPOINT = '/claude/build/repair';

type DialogMode =
  | { type: 'createKurs' }
  | { type: 'editKurs'; record: Kurse }
  | { type: 'createHund' }
  | { type: 'editHund'; record: Hunde }
  | { type: 'createAnmeldung'; kursId?: string }
  | { type: 'editAnmeldung'; record: Anmeldungen };

export default function DashboardOverview() {
  const {
    hunde, kurse, anmeldungen,
    hundeMap, kurseMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedAnmeldungen = enrichAnmeldungen(anmeldungen, { hundeMap, kurseMap });

  const [dialog, setDialog] = useState<DialogMode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; label: string } | null>(null);
  const [expandedKurs, setExpandedKurs] = useState<string | null>(null);

  const anmeldungenByKurs = useMemo(() => {
    const map = new Map<string, EnrichedAnmeldungen[]>();
    for (const a of enrichedAnmeldungen) {
      const kursId = extractRecordId(a.fields.kurs);
      if (!kursId) continue;
      const list = map.get(kursId) ?? [];
      list.push(a);
      map.set(kursId, list);
    }
    return map;
  }, [enrichedAnmeldungen]);

  const sortedKurse = useMemo(() =>
    [...kurse].sort((a, b) => {
      const ta = a.fields.termin ?? '';
      const tb = b.fields.termin ?? '';
      return ta.localeCompare(tb);
    }),
    [kurse]
  );

  const totalAngemeldet = anmeldungen.filter(a => a.fields.status?.key === 'angemeldet' || a.fields.status?.key === 'bestaetigt').length;

  // All hooks MUST be above early returns
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'kurs') await LivingAppsService.deleteKurseEntry(deleteTarget.id);
    else if (deleteTarget.type === 'hund') await LivingAppsService.deleteHundeEntry(deleteTarget.id);
    else if (deleteTarget.type === 'anmeldung') await LivingAppsService.deleteAnmeldungenEntry(deleteTarget.id);
    setDeleteTarget(null);
    fetchAll();
  }

  function statusBadge(status: Anmeldungen['fields']['status']) {
    const key = status?.key;
    const label = status?.label ?? '—';
    if (key === 'bestaetigt') return <Badge className="bg-green-100 text-green-700 border-green-200 shrink-0">{label}</Badge>;
    if (key === 'angemeldet') return <Badge className="bg-blue-100 text-blue-700 border-blue-200 shrink-0">{label}</Badge>;
    if (key === 'warteliste') return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 shrink-0">{label}</Badge>;
    if (key === 'storniert') return <Badge className="bg-red-100 text-red-700 border-red-200 shrink-0">{label}</Badge>;
    return <Badge variant="outline" className="shrink-0">{label}</Badge>;
  }

  function kursartBadge(kursart: Kurse['fields']['kursart']) {
    const label = kursart?.label ?? '';
    const key = kursart?.key ?? '';
    const colors: Record<string, string> = {
      welpenkurs: 'bg-amber-100 text-amber-700 border-amber-200',
      grunderziehung: 'bg-sky-100 text-sky-700 border-sky-200',
      fortgeschrittene: 'bg-violet-100 text-violet-700 border-violet-200',
      agility: 'bg-orange-100 text-orange-700 border-orange-200',
      einzeltraining: 'bg-teal-100 text-teal-700 border-teal-200',
    };
    return <Badge className={`${colors[key] ?? 'bg-muted text-muted-foreground'} shrink-0`}>{label}</Badge>;
  }

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Kurse"
          value={String(kurse.length)}
          description="Insgesamt"
          icon={<IconBook size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Hunde"
          value={String(hunde.length)}
          description="Registriert"
          icon={<IconDog size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Anmeldungen"
          value={String(anmeldungen.length)}
          description="Gesamt"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Aktiv"
          value={String(totalAngemeldet)}
          description="Angemeldet/Bestätigt"
          icon={<IconCheck size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Kurs-Übersicht (Hero) */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-semibold">Kurse & Anmeldungen</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setDialog({ type: 'createHund' })}>
              <IconPlus size={14} className="mr-1 shrink-0" />
              <span className="hidden sm:inline">Hund anlegen</span>
              <span className="sm:hidden">Hund</span>
            </Button>
            <Button size="sm" onClick={() => setDialog({ type: 'createKurs' })}>
              <IconPlus size={14} className="mr-1 shrink-0" />
              <span className="hidden sm:inline">Kurs anlegen</span>
              <span className="sm:hidden">Kurs</span>
            </Button>
          </div>
        </div>

        {sortedKurse.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed rounded-2xl">
            <IconBook size={48} className="text-muted-foreground" stroke={1.5} />
            <p className="text-muted-foreground text-sm">Noch keine Kurse angelegt.</p>
            <Button size="sm" onClick={() => setDialog({ type: 'createKurs' })}>
              <IconPlus size={14} className="mr-1" />Ersten Kurs anlegen
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedKurse.map(kurs => {
              const kursAnmeldungen = anmeldungenByKurs.get(kurs.record_id) ?? [];
              const max = kurs.fields.max_teilnehmer ?? 0;
              const aktiv = kursAnmeldungen.filter(a =>
                a.fields.status?.key === 'angemeldet' || a.fields.status?.key === 'bestaetigt'
              ).length;
              const auslastung = max > 0 ? Math.min(100, Math.round((aktiv / max) * 100)) : null;
              const isExpanded = expandedKurs === kurs.record_id;
              const isFull = max > 0 && aktiv >= max;

              return (
                <div key={kurs.record_id} className="border rounded-2xl overflow-hidden bg-card">
                  {/* Kurs Header */}
                  <div className="p-4">
                    <div className="flex flex-wrap items-start gap-2 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-base truncate">{kurs.fields.kurstitel ?? '(Kein Titel)'}</span>
                          {kursartBadge(kurs.fields.kursart)}
                          {isFull && <Badge className="bg-red-100 text-red-700 border-red-200 shrink-0">Ausgebucht</Badge>}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          {kurs.fields.termin && (
                            <span className="flex items-center gap-1">
                              <IconClock size={13} className="shrink-0" />
                              {formatDate(kurs.fields.termin)}
                            </span>
                          )}
                          {kurs.fields.ort && (
                            <span className="flex items-center gap-1 truncate">
                              <IconMapPin size={13} className="shrink-0" />
                              <span className="truncate">{kurs.fields.ort}</span>
                            </span>
                          )}
                          {kurs.fields.trainer_vorname && (
                            <span className="truncate">
                              Trainer: {kurs.fields.trainer_vorname} {kurs.fields.trainer_nachname}
                            </span>
                          )}
                          {kurs.fields.preis != null && (
                            <span className="flex items-center gap-1">
                              <IconCurrencyEuro size={13} className="shrink-0" />
                              {formatCurrency(kurs.fields.preis)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => setDialog({ type: 'editKurs', record: kurs })}
                        >
                          <IconPencil size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget({ type: 'kurs', id: kurs.record_id, label: kurs.fields.kurstitel ?? 'Kurs' })}
                        >
                          <IconTrash size={14} />
                        </Button>
                      </div>
                    </div>

                    {/* Auslastungsbalken + Anmeldungs-Toggle */}
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-0">
                        {max > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${auslastung! >= 90 ? 'bg-red-500' : auslastung! >= 60 ? 'bg-yellow-500' : 'bg-primary'}`}
                                style={{ width: `${auslastung}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">{aktiv}/{max} Teilnehmer</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">{kursAnmeldungen.length} Anmeldung{kursAnmeldungen.length !== 1 ? 'en' : ''}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setDialog({ type: 'createAnmeldung', kursId: kurs.record_id })}
                        >
                          <IconPlus size={12} className="mr-1 shrink-0" />Anmelden
                        </Button>
                        {kursAnmeldungen.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs flex items-center gap-1"
                            onClick={() => setExpandedKurs(isExpanded ? null : kurs.record_id)}
                          >
                            <IconUsers size={12} className="shrink-0" />
                            {kursAnmeldungen.length}
                            {isExpanded ? <IconChevronUp size={12} className="shrink-0" /> : <IconChevronDown size={12} className="shrink-0" />}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Anmeldungen-Liste (ausgeklappt) */}
                  {isExpanded && (
                    <div className="border-t bg-muted/30">
                      {kursAnmeldungen.length === 0 ? (
                        <p className="text-sm text-muted-foreground px-4 py-3">Keine Anmeldungen.</p>
                      ) : (
                        <div className="divide-y">
                          {kursAnmeldungen.map(a => {
                            const hundId = extractRecordId(a.fields.hund);
                            const hund = hundId ? hundeMap.get(hundId) : undefined;
                            return (
                              <div key={a.record_id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <IconDog size={14} className="shrink-0 text-muted-foreground" />
                                  <div className="min-w-0">
                                    <span className="font-medium text-sm truncate block">{a.hundName || '(Unbekannter Hund)'}</span>
                                    {hund && (
                                      <span className="text-xs text-muted-foreground truncate block">
                                        {hund.fields.halter_vorname} {hund.fields.halter_nachname}
                                        {hund.fields.rasse ? ` · ${hund.fields.rasse}` : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {statusBadge(a.fields.status)}
                                  <span className="text-xs text-muted-foreground">{formatDate(a.fields.anmeldedatum)}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => setDialog({ type: 'editAnmeldung', record: a })}
                                  >
                                    <IconPencil size={12} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    onClick={() => setDeleteTarget({ type: 'anmeldung', id: a.record_id, label: `${a.hundName} in ${a.kursName}` })}
                                  >
                                    <IconTrash size={12} />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Hunde-Schnellübersicht */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-semibold">Registrierte Hunde</h2>
          <Button size="sm" variant="outline" onClick={() => setDialog({ type: 'createHund' })}>
            <IconPlus size={14} className="mr-1 shrink-0" />Hund anlegen
          </Button>
        </div>
        {hunde.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 border border-dashed rounded-2xl">
            <IconDog size={48} className="text-muted-foreground" stroke={1.5} />
            <p className="text-muted-foreground text-sm">Noch keine Hunde registriert.</p>
            <Button size="sm" onClick={() => setDialog({ type: 'createHund' })}>
              <IconPlus size={14} className="mr-1" />Hund anlegen
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {hunde.map(hund => {
              const hundeAnmeldungen = enrichedAnmeldungen.filter(a => {
                const id = extractRecordId(a.fields.hund);
                return id === hund.record_id;
              });
              return (
                <div key={hund.record_id} className="border rounded-2xl p-4 bg-card overflow-hidden">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="font-semibold truncate">{hund.fields.hundename ?? '(Kein Name)'}</span>
                        {hund.fields.geschlecht && (
                          <Badge variant="outline" className="text-xs shrink-0">{hund.fields.geschlecht.label}</Badge>
                        )}
                      </div>
                      {hund.fields.rasse && (
                        <p className="text-sm text-muted-foreground truncate">{hund.fields.rasse}</p>
                      )}
                      {(hund.fields.halter_vorname || hund.fields.halter_nachname) && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          Halter: {hund.fields.halter_vorname} {hund.fields.halter_nachname}
                        </p>
                      )}
                      {hundeAnmeldungen.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {hundeAnmeldungen.length} Kurs{hundeAnmeldungen.length !== 1 ? 'e' : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setDialog({ type: 'editHund', record: hund })}
                      >
                        <IconPencil size={13} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget({ type: 'hund', id: hund.record_id, label: hund.fields.hundename ?? 'Hund' })}
                      >
                        <IconTrash size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Dialoge */}
      {dialog?.type === 'createKurs' && (
        <KurseDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async (fields) => { await LivingAppsService.createKurseEntry(fields); fetchAll(); }}
          enablePhotoScan={AI_PHOTO_SCAN['Kurse']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Kurse']}
        />
      )}
      {dialog?.type === 'editKurs' && (
        <KurseDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async (fields) => { await LivingAppsService.updateKurseEntry(dialog.record.record_id, fields); fetchAll(); }}
          defaultValues={dialog.record.fields}
          enablePhotoScan={AI_PHOTO_SCAN['Kurse']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Kurse']}
        />
      )}
      {dialog?.type === 'createHund' && (
        <HundeDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async (fields) => { await LivingAppsService.createHundeEntry(fields); fetchAll(); }}
          enablePhotoScan={AI_PHOTO_SCAN['Hunde']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Hunde']}
        />
      )}
      {dialog?.type === 'editHund' && (
        <HundeDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async (fields) => { await LivingAppsService.updateHundeEntry(dialog.record.record_id, fields); fetchAll(); }}
          defaultValues={dialog.record.fields}
          enablePhotoScan={AI_PHOTO_SCAN['Hunde']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Hunde']}
        />
      )}
      {dialog?.type === 'createAnmeldung' && (
        <AnmeldungenDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async (fields) => {
            const f = { ...fields };
            if (dialog.kursId) f.kurs = createRecordUrl(APP_IDS.KURSE, dialog.kursId);
            await LivingAppsService.createAnmeldungenEntry(f);
            fetchAll();
          }}
          defaultValues={dialog.kursId ? { kurs: createRecordUrl(APP_IDS.KURSE, dialog.kursId) } : undefined}
          hundeList={hunde}
          kurseList={kurse}
          enablePhotoScan={AI_PHOTO_SCAN['Anmeldungen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Anmeldungen']}
        />
      )}
      {dialog?.type === 'editAnmeldung' && (
        <AnmeldungenDialog
          open
          onClose={() => setDialog(null)}
          onSubmit={async (fields) => { await LivingAppsService.updateAnmeldungenEntry(dialog.record.record_id, fields); fetchAll(); }}
          defaultValues={dialog.record.fields}
          hundeList={hunde}
          kurseList={kurse}
          enablePhotoScan={AI_PHOTO_SCAN['Anmeldungen']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Anmeldungen']}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description={`Soll "${deleteTarget?.label}" wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-8 w-48" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
