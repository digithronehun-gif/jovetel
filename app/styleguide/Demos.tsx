'use client'

import { Heart, Moon, Sun, SunMoon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { CheckboxField } from '@/components/ui/Checkbox'
import { Chip, RemovableChip } from '@/components/ui/Chip'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { RadioCards } from '@/components/ui/RadioCards'
import { Select } from '@/components/ui/Select'
import { Slider } from '@/components/ui/Slider'
import { SwitchField } from '@/components/ui/Switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { ToastProvider, useToast } from '@/components/ui/Toast'
import { Tooltip } from '@/components/ui/Tooltip'

type Theme = 'system' | 'light' | 'dark'

/** Csak a styleguide-on: a <html data-theme> átkapcsolása (nem mentjük). */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')
  const next: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : SunMoon
  const label = { system: 'Rendszer szerint', light: 'Világos', dark: 'Sötét' }[theme]
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        const t = next[theme]
        setTheme(t)
        if (t === 'system') document.documentElement.removeAttribute('data-theme')
        else document.documentElement.setAttribute('data-theme', t)
      }}
    >
      <Icon aria-hidden /> Téma: {label}
    </Button>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-eyebrow text-ink-muted">{title}</p>
      {children}
    </div>
  )
}

const INTERESTS = ['Parfüm', 'Bőrápolás', 'Smink', 'Wellness', 'Könyv', 'Otthon']
const BUDGET = [
  { value: 5000, label: '5e' },
  { value: 10000, label: '10e' },
  { value: 15000, label: '15e' },
  { value: 20000, label: '20e' },
  { value: 30000, label: '30e' },
  { value: 50000, label: '50e' },
]

function ToastDemo() {
  const { toast } = useToast()
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        onClick={() =>
          toast({ title: 'Árfigyelő beállítva', description: 'Szólunk, ha olcsóbb lesz.' })
        }
      >
        Siker toast
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            tone: 'error',
            title: 'Nem sikerült menteni',
            description: 'Próbáld újra egy perc múlva.',
          })
        }
      >
        Hiba toast
      </Button>
    </div>
  )
}

export function InteractiveDemos() {
  const [selected, setSelected] = useState<string[]>(['Parfüm'])
  const [goal, setGoal] = useState('both')
  const [budget, setBudget] = useState(15000)
  const [skin, setSkin] = useState<string>()
  const [removable, setRemovable] = useState(['Barátnő', 'Születésnap', 'Parfüm'])

  return (
    <ToastProvider>
      <section id="interaktiv" className="flex flex-col gap-8 border-t border-line pt-10">
        <h2 className="text-display-m text-ink">Interaktív komponensek</h2>
        <div className="grid gap-8 md:grid-cols-2">
          <Block title="Chip: választható · letiltott">
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <Chip
                  key={i}
                  selected={selected.includes(i)}
                  onSelectedChange={(on) =>
                    setSelected((s) => (on ? [...s, i] : s.filter((x) => x !== i)))
                  }
                >
                  {i}
                </Chip>
              ))}
              <Chip disabled>Élmény</Chip>
            </div>
          </Block>
          <Block title="Chip: eltávolítható (így értettem)">
            <div className="flex flex-wrap gap-2">
              {removable.map((r) => (
                <RemovableChip
                  key={r}
                  removeLabel={`${r} eltávolítása`}
                  onRemove={() => setRemovable((x) => x.filter((y) => y !== r))}
                >
                  {r}
                </RemovableChip>
              ))}
            </div>
          </Block>
          <Block title="RadioCards (onboarding)">
            <RadioCards
              aria-label="Mire használnád?"
              value={goal}
              onValueChange={setGoal}
              options={[
                {
                  value: 'gifts',
                  label: 'Ajándékozásra',
                  description: 'Szeretteid, dátumok, ötletek',
                },
                {
                  value: 'beauty',
                  label: 'Szépségápolásra',
                  description: 'Bőrprofil, polc, árfigyelő',
                },
                { value: 'both', label: 'Mindkettőre' },
              ]}
            />
          </Block>
          <div className="flex flex-col gap-6">
            <Block title="Checkbox · Switch">
              <div className="flex flex-col">
                <CheckboxField
                  id="sg-cb1"
                  label="Kérem a heti válogatást"
                  description="Nem kötelező"
                />
                <CheckboxField id="sg-cb2" label="Elfogadom" defaultChecked />
                <CheckboxField id="sg-cb3" label="Letiltott" disabled />
                <SwitchField
                  id="sg-sw1"
                  label="Szolgáltatási értesítések"
                  description="Fontos nap, árcsökkenés, fogyóban lévő termék"
                  defaultChecked
                />
                <SwitchField id="sg-sw2" label="Marketing levelek" />
              </div>
            </Block>
            <Block title="Select">
              <Field id="sg-skin" label="Bőrtípus">
                <Select
                  id="sg-skin"
                  value={skin}
                  onValueChange={setSkin}
                  options={[
                    { value: 'normal', label: 'Normál' },
                    { value: 'szaraz', label: 'Száraz' },
                    { value: 'zsiros', label: 'Zsíros' },
                    { value: 'kombinalt', label: 'Kombinált' },
                    { value: 'erzekeny', label: 'Érzékeny' },
                  ]}
                />
              </Field>
            </Block>
          </div>
          <Block title="Slider (keret-sávok)">
            <Slider
              steps={BUDGET}
              value={budget}
              onValueChange={setBudget}
              label="Mennyit szánsz rá?"
              valueText={`${budget} forint`}
            />
          </Block>
          <Block title="Tabs">
            <Tabs defaultValue="polc">
              <TabsList>
                <TabsTrigger value="polc">Szépségpolc</TabsTrigger>
                <TabsTrigger value="figyelok">Árfigyelők</TabsTrigger>
              </TabsList>
              <TabsContent value="polc" className="text-body text-ink-muted">
                A polcodon lévő termékek.
              </TabsContent>
              <TabsContent value="figyelok" className="text-body text-ink-muted">
                A figyelt árak.
              </TabsContent>
            </Tabs>
          </Block>
          <Block title="Dialog · Sheet (alsó lap) · Tooltip · IconButton">
            <div className="flex flex-wrap items-center gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary">Dialog</Button>
                </DialogTrigger>
                <DialogContent title="Fiók törlése" description="Ez végleges. Írd be: TÖRLÉS">
                  <div className="flex justify-end gap-3">
                    <DialogClose asChild>
                      <Button variant="ghost">Mégse</Button>
                    </DialogClose>
                    <Button>Törlés</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="secondary">Szűrők (alsó lap)</Button>
                </SheetTrigger>
                <SheetContent title="Szűrők" description="Ár teljes költséggel, márka, bolt…">
                  <div className="flex flex-wrap gap-2">
                    {INTERESTS.map((i) => (
                      <Chip key={i}>{i}</Chip>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
              <Tooltip content="Listára teszem">
                <IconButton aria-label="Listára teszem" variant="secondary">
                  <Heart aria-hidden />
                </IconButton>
              </Tooltip>
            </div>
          </Block>
          <Block title="Toast">
            <ToastDemo />
          </Block>
        </div>
      </section>
    </ToastProvider>
  )
}
