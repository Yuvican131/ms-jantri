
"use client"

import { useState, useRef, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import GridSheet from "@/components/grid-sheet"
import ClientsManager, { Client } from "@/components/clients-manager"
import AccountsManager, { Account } from "@/components/accounts-manager"
import { Users, Building, ArrowLeft, Calendar as CalendarIcon, History, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

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
};


export default function Home() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
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

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);


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
  
const handleClientSheetSave = (clientName: string, clientId: string, newData: { [key: string]: string }, draw: string) => {
    setSavedSheetLog(prevLog => {
        const drawLogs = prevLog[draw] || [];
        const existingLogIndex = drawLogs.findIndex(log => log.clientId === clientId);
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
            // First time this client is saving in this draw
            const newEntryTotal = Object.values(newData).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
            const newLogEntry = { clientName, clientId, gameTotal: newEntryTotal, data: newData };
            updatedLogs = [...drawLogs, newLogEntry];
        }

        const newLog = { ...prevLog, [draw]: updatedLogs };
        updateAccountsFromLog(newLog); // Update accounts after log is updated
        return newLog;
    });

    toast({
        title: "Sheet Saved",
        description: `${clientName}'s data has been logged.`,
    });
};

const updateAccountsFromLog = (currentSavedSheetLog: { [draw: string]: SavedSheetInfo[] }) => {
    setAccounts(prevAccounts => {
        return prevAccounts.map(acc => {
            const client = clients.find(c => c.id === acc.id);
            if (!client) return acc;

            const clientCommissionPercent = parseFloat(client.comm) / 100;
            const passingMultiplier = parseFloat(client.pair) || 80;
            const activeBalance = parseFloat(client.activeBalance) || 0;

            const updatedDraws: { [key: string]: { totalAmount: number; passingAmount: number } } = {};

            // Iterate over all draws to calculate totals
            draws.forEach(drawName => {
                const drawLogs = currentSavedSheetLog[drawName] || [];
                const clientLog = drawLogs.find(log => log.clientId === client.id);

                if (clientLog) {
                    const declaredNumberForDraw = declaredNumbers[drawName];
                    const amountInCell = declaredNumberForDraw ? parseFloat(clientLog.data[declaredNumberForDraw]) || 0 : 0;

                    updatedDraws[drawName] = {
                        totalAmount: clientLog.gameTotal,
                        passingAmount: amountInCell
                    };
                } else if(acc.draws && acc.draws[drawName]) {
                    // Keep existing draw data if no new log for this draw
                    updatedDraws[drawName] = acc.draws[drawName];
                } else {
                    updatedDraws[drawName] = { totalAmount: 0, passingAmount: 0 };
                }
            });

            // Calculate the final balance
            const netFromDraws = Object.values(updatedDraws).reduce((balance, drawDetails) => {
                const drawTotal = drawDetails.totalAmount || 0;
                const drawCommission = drawTotal * clientCommissionPercent;
                const drawNet = drawTotal - drawCommission;
                const drawPassingTotal = (drawDetails.passingAmount || 0) * passingMultiplier;
                return balance + (drawNet - drawPassingTotal);
            }, 0);
            
            const newBalance = activeBalance - netFromDraws;

            return {
                ...acc,
                draws: updatedDraws,
                balance: String(newBalance.toFixed(2))
            };
        });
    });
};


  const handleAddClient = (client: Client) => {
    setClients(prev => [...prev, client]);
    const newAccount: Account = {
      id: client.id, // Use client id for linking
      clientName: client.name,
      balance: '0',
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
  
  const updateAllClientsDraw = (isUndeclare = false) => {
      const currentDrawLogs = savedSheetLog[declarationDraw] || [];

      const updatedAccounts = accounts.map(acc => {
        const client = clients.find(c => c.id === acc.id);
        if (!client) return acc;
    
        const clientLog = currentDrawLogs.find(log => log.clientId === client.id);
        const clientSheetData = clientLog?.data || {};

        const amountInCell = parseFloat(clientSheetData[declarationNumber]) || 0;
        const passingMultiplier = parseFloat(client.pair) || 80;
    
        const currentDraws = { ...(acc.draws || {}) };
        const currentDrawData = { ...(currentDraws[declarationDraw] || { totalAmount: 0, passingAmount: 0 }) };
    
        const newPassingAmount = isUndeclare ? 0 : amountInCell;
    
        const updatedDrawDataForDeclaration = {
          ...currentDrawData,
          passingAmount: newPassingAmount,
        };
    
        const updatedDraws = { ...currentDraws, [declarationDraw]: updatedDrawDataForDeclaration };
    
        const clientCommissionPercent = parseFloat(client.comm) / 100;
        const activeBalance = parseFloat(client.activeBalance) || 0;

        const netFromDraws = Object.values(updatedDraws).reduce((total, drawDetails) => {
            const drawTotal = drawDetails.totalAmount || 0;
            const drawCommission = drawTotal * clientCommissionPercent;
            const drawNet = drawTotal - drawCommission;
            const drawPassingAmount = (drawDetails.passingAmount || 0) * passingMultiplier;
            return total + (drawNet - drawPassingAmount);
        }, 0);
        
        const totalBalanceAfterUpdate = activeBalance - netFromDraws;

        return {
          ...acc,
          draws: updatedDraws,
          balance: totalBalanceAfterUpdate.toFixed(2),
        };
      });
    
      setAccounts(updatedAccounts);
    };


  const handleDeclare = () => {
    updateAllClientsDraw(false);
    toast({ title: "Success", description: `Number ${declarationNumber} has been declared for draw ${declarationDraw} for all clients.` });
    setDeclarationDialogOpen(false);
  };
  
  const handleUndeclare = () => {
    updateAllClientsDraw(true);
    setDeclaredNumbers(prev => {
        const newDeclared = { ...prev };
        delete newDeclared[declarationDraw];
        return newDeclared;
    });
    toast({ title: "Success", description: `Result undeclared for draw ${declarationDraw} for all clients.` });
    setDeclarationDialogOpen(false);
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading...</p>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <main className="flex-1 p-2 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <TabsList className="grid grid-cols-3 md:w-auto p-0.5 gap-0.5">
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
            <Button onClick={signOut} variant="ghost" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
          <div className="flex-1 flex flex-col">
            <TabsContent value="sheet" className="flex-1 flex flex-col" style={{ display: activeTab === 'sheet' ? 'flex' : 'none' }}>
              {selectedInfo ? (
                <div className="flex-1">
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
            <TabsContent value="clients" className="flex-1" style={{ display: activeTab === 'clients' ? 'block' : 'none' }}>
              <ClientsManager 
                clients={clients} 
                accounts={accounts}
                onAddClient={handleAddClient} 
                onUpdateClient={handleUpdateClient} 
                onDeleteClient={handleDeleteClient}
              />
            </TabsContent>
            <TabsContent value="accounts" className="flex-1" style={{ display: activeTab === 'accounts' ? 'block' : 'none' }}>
              <AccountsManager accounts={accounts} clients={clients} setAccounts={setAccounts} />
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
            <p className="text-lg">Are you sure you want to declare or undeclare the number <strong className="text-primary">{declarationNumber}</strong>?</p>
          </div>
          <DialogFooter>
            <Button onClick={handleUndeclare} variant="destructive">Undeclare</Button>
            <Button onClick={handleDeclare}>Declare</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
