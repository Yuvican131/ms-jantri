
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


export default function Home() {
  const gridSheetRef = useRef<{ handleClientUpdate: (client: Client) => void; clearSheet: () => void; getClientData: (clientId: string) => any }>(null);
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
  
  const handleClientSheetSave = (clientName: string, gameTotal: number, draw: string) => {
    setAccounts(prevAccounts => {
        const client = clients.find(c => c.name === clientName);
        if (!client) return prevAccounts;

        const clientCommissionPercent = parseFloat(client.comm) / 100;
        
        return prevAccounts.map(acc => {
            if (acc.clientName === clientName) {
                const currentDraws = acc.draws || {};
                const currentDrawData = currentDraws[draw] || { totalAmount: 0, passingAmount: 0, multiplier: 0 };
                
                const updatedDrawData = {
                    ...currentDrawData,
                    totalAmount: currentDrawData.totalAmount + gameTotal,
                };
                
                const updatedDraws = { ...currentDraws, [draw]: updatedDrawData };
                
                // Recalculate balance based on all draws for this client
                const newBalance = Object.values(updatedDraws).reduce((balance, drawDetails) => {
                    const drawTotal = drawDetails.totalAmount || 0;
                    const drawCommission = drawTotal * clientCommissionPercent;
                    const drawNet = drawTotal - drawCommission;
                    const passingMultiplier = parseFloat(client.pair) || 90;
                    const drawPassingTotal = (drawDetails.passingAmount || 0) * passingMultiplier;
                    return balance + (drawNet - drawPassingTotal);
                }, 0);

                return {
                    ...acc,
                    draws: updatedDraws,
                    balance: String(newBalance.toFixed(2))
                };
            }
            return acc;
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
    if (numValue.length === 2) {
      setDeclarationDraw(draw);
      setDeclarationNumber(numValue);
      setDeclarationDialogOpen(true);
    }
  };
  
  const updateAllClientsDraw = (passingValue: number, isUndeclare = false) => {
    setAccounts(prevAccounts => {
        return prevAccounts.map(acc => {
            const client = clients.find(c => c.id === acc.id);
            if (!client) return acc;

            const clientCommissionPercent = parseFloat(client.comm) / 100;
            const passingMultiplier = parseFloat(client.pair) || 90;
            
            const currentDraws = acc.draws || {};
            const currentDrawData = currentDraws[declarationDraw] || { totalAmount: 0, passingAmount: 0, multiplier: passingMultiplier };
            
            const clientData = gridSheetRef.current?.getClientData(client.id);
            const amountInCell = parseFloat(clientData?.[declarationNumber]) || 0;
            
            const newDrawData = {
                ...currentDrawData,
                passingAmount: isUndeclare ? 0 : amountInCell,
            };

            const updatedDraws = { ...currentDraws, [declarationDraw]: newDrawData };

            const newBalance = Object.values(updatedDraws).reduce((balance, drawDetails) => {
                const drawTotalAmount = drawDetails.totalAmount || 0;
                const drawCommission = drawTotalAmount * clientCommissionPercent;
                const drawNet = drawTotalAmount - drawCommission;
                const drawPassingTotal = (drawDetails.passingAmount || 0) * (parseFloat(client.pair) || 90);
                return balance + (drawNet - drawPassingTotal);
            }, 0);

            return {
                ...acc,
                draws: updatedDraws,
                balance: newBalance.toFixed(2),
            };
        });
    });
  };

  const handleDeclare = () => {
    updateAllClientsDraw(parseFloat(declarationNumber));
    toast({ title: "Success", description: `Number ${declarationNumber} has been declared for draw ${declarationDraw} for all clients.` });
    setDeclarationDialogOpen(false);
  };
  
  const handleUndeclare = () => {
    updateAllClientsDraw(0, true);
    toast({ title: "Success", description: `Result undeclared for draw ${declarationDraw} for all clients.` });
    setDeclarationDialogOpen(false);
  };


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <main className="flex-1 p-2 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
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
                                onChange={(e) => {
                                  const inputElement = e.target as HTMLInputElement;
                                  handleDeclarationInputChange(draw, inputElement.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const inputElement = e.target as HTMLInputElement;
                                        handleDeclarationInputChange(draw, inputElement.value);
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
  )
}
