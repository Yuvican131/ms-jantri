
"use client"

import { useState, useRef, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import GridSheet from "@/components/grid-sheet"
import ClientsManager, { Client } from "@/components/clients-manager"
import AccountsManager, { Account } from "@/components/accounts-manager"
import { Users, Building, ArrowLeft, Calendar as CalendarIcon, History } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

function GridIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18" />
      <path d="M3 7h18" />
      <path d="M12 3v18" />
      <path d="M3 12h18" />
      <path d="M17 3v18" />
      <path d="M3 17h18" />
    </svg>
  )
}


export default function Home() {
  const gridSheetRef = useRef<{ handleClientUpdate: (client: Client) => void; clearSheet: () => void }>(null);
  const [selectedInfo, setSelectedInfo] = useState<{ draw: string; date: Date } | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [lastEntry, setLastEntry] = useState('');
  const [isLastEntryDialogOpen, setIsLastEntryDialogOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    setDate(new Date());
    document.body.classList.add('dark');
  }, []);

  const handleClientUpdateForSheet = (client: Client) => {
    if (gridSheetRef.current) {
      gridSheetRef.current.handleClientUpdate(client);
    }
  };
  
  const handleSelectDraw = (draw: string) => {
    if (date) {
      setSelectedInfo({ draw, date });
    }
  };

  const handleBackToDraws = () => {
    setSelectedInfo(null);
  };
  
  const handleClientSheetSave = (clientName: string, gameTotal: number) => {
    setAccounts(prevAccounts => {
      const existingAccount = prevAccounts.find(acc => acc.clientName === clientName);
      if (existingAccount) {
        return prevAccounts.map(acc => 
          acc.clientName === clientName 
            ? { ...acc, gameTotal: String(parseFloat(acc.gameTotal) + gameTotal) } 
            : acc
        );
      } else {
        const newAccount: Account = {
          id: Date.now().toString(),
          clientName,
          gameTotal: String(gameTotal),
          commission: '0',
          balance: '0'
        };
        return [...prevAccounts, newAccount];
      }
    });
  };

  const draws = ["DD", "ML", "FB", "GB", "GL", "DS"];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <main className="flex-1 p-2">
        <Tabs defaultValue="sheet" className="w-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <TabsList className="grid grid-cols-3 md:w-auto p-0.5 gap-0.5">
                <TabsTrigger value="sheet" className="gap-1 rounded-sm">
                  <GridIcon className="h-4 w-4" />
                  SHEET
                </TabsTrigger>
                <TabsTrigger value="clients" className="gap-1 rounded-sm">
                  <Users className="h-4 w-4" />
                  CLIENTS
                </TabsTrigger>
                <TabsTrigger value="accounts" className="gap-1 rounded-sm">
                  <Building className="h-4 w-4" />
                  ACCOUNTS
                </TabsTrigger>
              </TabsList>
               {selectedInfo && (
                 <div className="flex items-center">
                    <Button onClick={handleBackToDraws} variant="ghost" className="ml-2">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Draws
                    </Button>
                    <Button onClick={() => setIsLastEntryDialogOpen(true)} variant="outline" size="sm" className="ml-2">
                        <History className="mr-2 h-4 w-4" />
                        Last Entry
                    </Button>
                </div>
              )}
            </div>
          </div>
          <TabsContent value="sheet">
            {selectedInfo ? (
              <div>
                <GridSheet 
                  ref={gridSheetRef} 
                  draw={selectedInfo.draw} 
                  date={selectedInfo.date} 
                  lastEntry={lastEntry} 
                  setLastEntry={setLastEntry} 
                  isLastEntryDialogOpen={isLastEntryDialogOpen} 
                  setIsLastEntryDialogOpen={setIsLastEntryDialogOpen}
                  clients={clients}
                  onClientSheetSave={handleClientSheetSave}
                />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Select a Date and Draw</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full sm:w-[280px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4">
                    {draws.map((draw) => (
                      <Button key={draw} onClick={() => handleSelectDraw(draw)} className="h-16 sm:h-20 text-lg sm:text-xl font-bold bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white shadow-lg">
                        {draw}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          <TabsContent value="clients" className="mt-2">
            <ClientsManager clients={clients} setClients={setClients} onClientUpdateForSheet={handleClientUpdateForSheet} />
          </TabsContent>
          <TabsContent value="accounts" className="mt-2">
            <AccountsManager accounts={accounts} setAccounts={setAccounts} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
