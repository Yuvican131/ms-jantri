
"use client"

import { useState, useRef, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import GridSheet from "@/components/grid-sheet"
import ClientsManager, { Client } from "@/components/clients-manager"
import AccountsManager, { Account } from "@/components/accounts-manager"
import LedgerRecord from "@/components/ledger-record"
import AdminPanel from "@/components/admin-panel"
import { Users, Building, ArrowLeft, Calendar as CalendarIcon, History, ClipboardCopy, FileSpreadsheet, Shield } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn, formatNumber } from "@/lib/utils"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

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

export type SavedSheetInfo = {
  clientName: string;
  clientId: string;
  gameTotal: number;
  data: { [key: string]: string };
  date: string; // ISO date string
};

export default function Home() {
  const gridSheetRef = useRef<{ handleClientUpdate: (client: Client) => void; clearSheet: () => void; getClientData: (clientId: string) => any, getClientCurrentData: (clientId: string) => any | undefined, getClientPreviousData: (clientId: string) => any | undefined }>(null);
  const [selectedInfo, setSelectedInfo] = useState<{ draw: string; date: Date } | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [lastEntry, setLastEntry] = useState('');
  const [isLastEntryDialogOpen, setIsLastEntryDialogOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeTab, setActiveTab] = useState("sheet");

  const [declarationDialogOpen, setDeclarationDialogOpen] = useState(false);
  const [declarationDraw, setDeclarationDraw] = useState("");
  const [declarationNumber, setDeclarationNumber] = useState("");
  const { toast } = useToast();
  const [declaredNumbers, setDeclaredNumbers] = useState<{ [draw: string]: string }>({});
  const [savedSheetLog, setSavedSheetLog] = useState<{ [draw: string]: SavedSheetInfo[] }>({});

  useEffect(() => {
    setDate(new Date());
  }, []);

  // Recalculate accounts whenever clients, logs, or declared numbers change
  useEffect(() => {
    updateAccountsFromLog(savedSheetLog);
  }, [clients, savedSheetLog, declaredNumbers]);


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
  
const handleClientSheetSave = (clientName: string, clientId: string, newData: { [key: string]: string }, draw: string, entryDate: Date) => {
    const todayStr = entryDate.toISOString().split('T')[0];

    setSavedSheetLog(prevLog => {
        const drawLogs = prevLog[draw] || [];
        const existingLogIndex = drawLogs.findIndex(log => log.clientId === clientId && log.date === todayStr);
        let updatedLogs;
        
        if (existingLogIndex > -1) {
            // Client has saved data before in this draw, so we merge
            const existingLog = drawLogs[existingLogIndex];
            const mergedData: { [key: string]: string } = { ...existingLog.data };

            // Add new values to existing values
            Object.entries(newData).forEach(([key, value]) => {
                mergedData[key] = String((parseFloat(mergedData[key]) || 0) + (parseFloat(value) || 0));
            });
            
            const newTotal = Object.values(mergedData).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);

            const updatedLogEntry = {
                ...existingLog,
                gameTotal: newTotal,
                data: mergedData,
            };
            updatedLogs = [...drawLogs];
            updatedLogs[existingLogIndex] = updatedLogEntry;
        } else {
            // First time this client is saving in this draw for this date
            const newEntryTotal = Object.values(newData).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
            const newLogEntry: SavedSheetInfo = { 
              clientName, 
              clientId, 
              gameTotal: newEntryTotal, 
              data: newData,
              date: todayStr,
            };
            updatedLogs = [...drawLogs, newLogEntry];
        }

        return { ...prevLog, [draw]: updatedLogs };
    });

    toast({
        title: "Sheet Saved",
        description: `${clientName}'s data has been logged.`,
    });
};

const updateAccountsFromLog = (currentSavedSheetLog: { [draw: string]: SavedSheetInfo[] }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    setAccounts(prevAccounts => {
        return prevAccounts.map(acc => {
            const client = clients.find(c => c.id === acc.id);
            if (!client) return acc;

            const clientCommissionPercent = parseFloat(client.comm) / 100;
            const passingMultiplier = parseFloat(client.pair) || 80;
            let activeBalance = parseFloat(client.activeBalance) || 0;

            const updatedDraws: { [key: string]: { totalAmount: number; passingAmount: number } } = {};

            let totalPlayedToday = 0;
            let totalWinningsToday = 0;

            draws.forEach(drawName => {
                const drawLogs = currentSavedSheetLog[drawName] || [];
                const clientLogForToday = drawLogs.find(log => log.clientId === client.id && log.date === todayStr);

                let totalAmount = 0;
                let passingAmount = 0;

                if (clientLogForToday) {
                    totalAmount = clientLogForToday.gameTotal;
                    const declaredNumberForDraw = declaredNumbers[drawName];
                    passingAmount = declaredNumberForDraw ? parseFloat(clientLogForToday.data[declaredNumberForDraw]) || 0 : 0;
                }
                
                updatedDraws[drawName] = { totalAmount, passingAmount };
                totalPlayedToday += totalAmount;
                totalWinningsToday += passingAmount * passingMultiplier;
            });
            
            const totalCommissionToday = totalPlayedToday * clientCommissionPercent;
            const netFromGames = totalPlayedToday - totalCommissionToday;

            // This is the final balance from the client's perspective
            // A positive balance means the broker owes the client.
            // A negative balance means the client owes the broker.
            const newBalance = activeBalance - (netFromGames - totalWinningsToday);

            return {
                ...acc,
                draws: updatedDraws,
                balance: String(newBalance)
            };
        });
    });
};


  const handleAddClient = (client: Client) => {
    setClients(prev => [...prev, client]);
    const newAccount: Account = {
      id: client.id, // Use client id for linking
      clientName: client.name,
      balance: client.activeBalance || '0',
      draws: {}
    };
    setAccounts(prev => [...prev, newAccount]);
  };
  
  const handleUpdateClient = (updatedClient: Client) => {
    setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
    setAccounts(accounts.map(a => a.id === updatedClient.id ? { ...a, clientName: updatedClient.name } : a));
    if (gridSheetRef.current) {
      gridSheetRef.current.handleClientUpdate(updatedClient);
    }
  };
  
  const handleDeleteClient = (clientId: string) => {
    setClients(clients.filter(c => c.id !== clientId));
    setAccounts(accounts.filter(a => a.id !== clientId));
  };
  
  const handleClientTransaction = (clientId: string, amount: number) => {
    setClients(clients.map(c => {
      if (c.id === clientId) {
        const newBalance = (parseFloat(c.activeBalance) || 0) + amount;
        return { ...c, activeBalance: String(newBalance) };
      }
      return c;
    }));
  };


  const draws = ["DD", "ML", "FB", "GB", "GL", "DS"];

  const handleDeclarationInputChange = (draw: string, value: string) => {
    const numValue = value.replace(/[^0-9]/g, "").slice(0, 2);
    setDeclaredNumbers(prev => ({ ...prev, [draw]: numValue }));
    if (numValue.length === 2) {
      setDeclarationDraw(draw);
      setDeclarationNumber(numValue);
      setDeclarationDialogOpen(true);
    }
  };
  
  const handleDeclareOrUndeclare = () => {
    // Just trigger a re-calculation of accounts
    updateAccountsFromLog(savedSheetLog);
    toast({ title: "Success", description: `Results processed for draw ${declarationDraw}.` });
    setDeclarationDialogOpen(false);
  };
  
  const handleUndeclare = () => {
    setDeclaredNumbers(prev => {
        const newDeclared = { ...prev };
        delete newDeclared[declarationDraw];
        return newDeclared;
    });
    // This will trigger the useEffect to recalculate
    toast({ title: "Success", description: `Result undeclared for draw ${declarationDraw}.` });
    setDeclarationDialogOpen(false);
  };


  return (
    <div className="flex h-screen w-full flex-col bg-background">
      <main className="flex-1 flex flex-col p-2 min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-1.5">
            <div className="flex items-center">
              <TabsList className="grid grid-cols-5 md:w-auto p-0.5 gap-0.5">
                <TabsTrigger value="sheet" className="gap-1 rounded-sm">
                  <GridIcon className="h-4 w-4" />
                  Home
                </TabsTrigger>
                <TabsTrigger value="clients" className="gap-1 rounded-sm">
                  <Users className="h-4 w-4" />
                  CLIENTS
                </TabsTrigger>
                <TabsTrigger value="accounts" className="gap-1 rounded-sm">
                  <Building className="h-4 w-4" />
                  ACCOUNT LEDGER
                </TabsTrigger>
                <TabsTrigger value="ledger-record" className="gap-1 rounded-sm">
                  <FileSpreadsheet className="h-4 w-4" />
                  Client Performance
                </TabsTrigger>
                <TabsTrigger value="admin-panel" className="gap-1 rounded-sm">
                  <Shield className="h-4 w-4" />
                  Admin Panel
                </TabsTrigger>
              </TabsList>
               {selectedInfo && activeTab === 'sheet' && (
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
          <div className="flex-1 flex flex-col min-h-0">
            <TabsContent value="sheet" className="flex-1 flex flex-col min-h-0 h-full">
              {selectedInfo ? (
                <div className="flex-1 min-h-0">
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
                    savedSheetLog={savedSheetLog[selectedInfo.draw] || []}
                    accounts={accounts}
                    draws={draws}
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
                        <div key={draw} className="flex flex-col gap-1">
                            <Button onClick={() => handleSelectDraw(draw)} className="h-16 sm:h-20 text-lg sm:text-xl font-bold bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white shadow-lg">
                              {draw}
                            </Button>
                             <Input
                                type="text"
                                placeholder="00"
                                className="w-full h-8 text-center"
                                maxLength={2}
                                value={declaredNumbers[draw] || ''}
                                onChange={(e) => {
                                  handleDeclarationInputChange(draw, e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const inputElement = e.target as HTMLInputElement;
                                        if(inputElement.value.length === 2) {
                                          handleDeclarationInputChange(draw, inputElement.value);
                                        }
                                    }
                                }}
                            />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="clients" className="flex-1 flex flex-col min-h-0">
              <ClientsManager 
                clients={clients} 
                accounts={accounts}
                onAddClient={handleAddClient} 
                onUpdateClient={handleUpdateClient} 
                onDeleteClient={handleDeleteClient}
                onClientTransaction={handleClientTransaction}
              />
            </TabsContent>
            <TabsContent value="accounts" className="flex-1 flex flex-col min-h-0">
              <AccountsManager accounts={accounts} clients={clients} setAccounts={setAccounts} />
            </TabsContent>
             <TabsContent value="ledger-record" className="flex-1 flex flex-col min-h-0">
              <LedgerRecord clients={clients} savedSheetLog={savedSheetLog} draws={draws} declaredNumbers={declaredNumbers} />
            </TabsContent>
            <TabsContent value="admin-panel" className="flex-1 flex flex-col min-h-0">
              <AdminPanel accounts={accounts} clients={clients} savedSheetLog={savedSheetLog} declaredNumbers={declaredNumbers} />
            </TabsContent>
          </div>
        </Tabs>
      </main>

       <Dialog open={declarationDialogOpen} onOpenChange={setDeclarationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Declare Result for Draw {declarationDraw}</DialogTitle>
          </DialogHeader>
          <div className="my-4 text-center">
            <p className="text-lg">Are you sure you want to declare the number <strong className="text-primary">{declarationNumber}</strong>?</p>
            <p className="text-sm text-muted-foreground">This will finalize calculations for this draw.</p>
          </div>
          <DialogFooter>
            <Button onClick={handleUndeclare} variant="destructive">Undeclare</Button>
            <Button onClick={handleDeclareOrUndeclare}>Declare</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    