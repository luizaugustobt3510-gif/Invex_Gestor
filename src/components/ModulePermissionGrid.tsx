import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { MODULES_CATALOG, CHILD_MODULES, type ModuleDef } from '@/config/modules';

/**
 * Grade de módulos com switches, usada em Perfis × Módulos e Usuários × Módulos.
 * Módulos com submódulos (ex.: Clínica) aparecem como um bloco: o switch do pai
 * libera/bloqueia todos os submódulos de uma vez, e cada submódulo pode ser
 * ajustado individualmente.
 */
interface Props {
  modules: ModuleDef[];
  isChecked: (key: string) => boolean;
  isCompanyOn: (key: string) => boolean;
  saving: boolean;
  onToggle: (key: string, next: boolean) => void;
  onToggleMany: (keys: string[], next: boolean) => void;
}

/** Estado do pai calculado a partir dos submódulos: todos liberados = ligado. */
export function parentState(childKeys: string[], isChecked: (k: string) => boolean) {
  const on = childKeys.filter(isChecked).length;
  return { on, total: childKeys.length, checked: childKeys.length > 0 && on === childKeys.length };
}

export function ModulePermissionGrid({ modules, isChecked, isCompanyOn, saving, onToggle, onToggleMany }: Props) {
  const inList = new Set(modules.map((m) => m.key));
  const tops: ModuleDef[] = MODULES_CATALOG.filter(
    (m) => !m.parent && !m.core && (inList.has(m.key) || (CHILD_MODULES[m.key] || []).some((c) => inList.has(c))),
  );

  const renderCard = (m: ModuleDef, companyOn: boolean) => {
    const checked = isChecked(m.key);
    return (
      <div
        key={m.key}
        className={`flex items-start justify-between gap-3 rounded-lg border p-3 transition ${
          checked ? 'bg-primary/5 border-primary/30' : 'bg-background'
        } ${!companyOn ? 'opacity-50' : ''}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{m.label}</span>
            {!companyOn && (
              <Badge variant="outline" className="text-[10px] py-0">Módulo desligado</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{m.description}</p>
        </div>
        <Switch
          checked={checked}
          disabled={saving || !companyOn}
          onCheckedChange={(c) => onToggle(m.key, c)}
          aria-label={m.label}
        />
      </div>
    );
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {tops.map((m) => {
        const childKeys = CHILD_MODULES[m.key] || [];
        if (childKeys.length === 0) return renderCard(m, isCompanyOn(m.key));

        const parentOn = isCompanyOn(m.key);
        const children = MODULES_CATALOG.filter((c) => childKeys.includes(c.key));
        const enabledChildren = children.filter((c) => isCompanyOn(c.key)).map((c) => c.key);
        const st = parentState(enabledChildren, isChecked);
        return (
          <div
            key={m.key}
            className={`sm:col-span-2 rounded-lg border p-3 space-y-3 ${
              st.on > 0 ? 'border-primary/30 bg-primary/5' : 'bg-background'
            } ${enabledChildren.length === 0 ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{m.label}</span>
                  <Badge variant="secondary" className="text-[10px] py-0">
                    {st.on}/{st.total} submódulos liberados
                  </Badge>
                  {!parentOn && (
                    <Badge variant="outline" className="text-[10px] py-0">Módulo desligado</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Liberar a {m.label} libera todos os submódulos abaixo. Depois ajuste um a um se precisar.
                </p>
              </div>
              <Switch
                checked={st.checked}
                disabled={saving || enabledChildren.length === 0}
                onCheckedChange={(c) => onToggleMany([m.key, ...enabledChildren], c)}
                aria-label={`Liberar ${m.label} inteira`}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 pl-3 border-l-2 border-primary/20">
              {children
                .filter((c) => inList.has(c.key) || inList.has(m.key))
                .map((c) => renderCard(c, isCompanyOn(c.key)))}
            </div>
          </div>
        );
      })}
      {tops.length === 0 && (
        <div className="col-span-full text-center py-8 text-sm text-muted-foreground">
          Nenhum módulo encontrado.
        </div>
      )}
    </div>
  );
}
