
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import type { Client } from "./clients-manager"
import { useToast } from "@/hooks/use-toast"

export type Account = {
  id: string
  clientName: string
  gameTotal: string
  commission: string
  balance: string
  draws?: { [key: string]: DrawData }
}

type DrawData = {
  totalAmount: number;
  passingAmount: number;
  multiplier: number;
}

type AccountsManagerProps = {
  accounts: Account[];
  clients: Client[];
  setAccounts: (accounts: Account[]) => void;
};

const draws = ["DD", "ML", "FB", "GB", "GL", "DS"];

const DrawDetailsPanel = ({
  client,
  account,
  drawName,
  drawData,
  onUpdate,
}: {
  client: Client | undefined;
  account: Account;
  drawName: string;
  drawData: DrawData | undefined;
  onUpdate: (accountId: string, drawName: string, newDrawData: DrawData) => void;
}) => {
  const [inputValue, setInputValue] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [numberToDeclare, setNumberToDeclare] = useState("");
  const { toast } = useToast();

  const totalAmount = drawData?.totalAmount || 0;
  const clientCommissionPercent = client ? parseFloat(client.comm) / 100 : 0.10;
  const commission = totalAmount * clientCommissionPercent;
  const afterCommission = totalAmount - commission;
  const passingAmount = drawData?.passingAmount || 0;
  const passingMultiplier = client ? parseFloat(client.pair) : 90;
  const passingTotal = passingAmount * passingMultiplier;
  const finalTotal = afterCommission - passingTotal;
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
    setInputValue(value);
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.length === 2) {
      setNumberToDeclare(inputValue);
      setDialogOpen(true);
    }
  }

  const handleDeclare = () => {
    const newPassingAmount = parseFloat(numberToDeclare);
    if (!isNaN(newPassingAmount)) {
      const newDrawData = {
        totalAmount: drawData?.totalAmount || 0,
        passingAmount: newPassingAmount,
        multiplier: passingMultiplier,
      };
      onUpdate(account.id, drawName, newDrawData);
      toast({ title: "Success", description: `Number ${numberToDeclare} has been declared for draw ${drawName}.` });
    }
    setDialogOpen(false);
    setInputValue("");
  };

  const handleUndeclare = () => {
     const newDrawData = {
        totalAmount: drawData?.totalAmount || 0,
        passingAmount: 0,
        multiplier: passingMultiplier,
      };
      onUpdate(account.id, drawName, newDrawData);
      toast({ title: "Success", description: `Number ${numberToDeclare} has been undeclared for draw ${drawName}.` });
    setDialogOpen(false);
    setInputValue("");
  };


  return (
    <>
      <div className="p-4 bg-muted/50 rounded-lg text-sm font-mono">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-foreground/80">User Name</span><span className="text-right font-semibold text-primary">: {client?.name || 'N/A'}</span>
           <div className="text-foreground/80 flex items-center">
            Draw Name ({drawName})
            <span className="flex items-center ml-1">
              (
              <Input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                className="w-10 h-6 text-center bg-background p-0"
                placeholder="00"
              />
              )
            </span>
            (Total)
          </div>
          <span className="text-right font-semibold">: ₹{totalAmount.toFixed(2)}</span>
          <span className="text-foreground/80">{clientCommissionPercent*100}% Commission Amt</span><span className="text-right font-semibold">: ₹{commission.toFixed(2)}</span>
          <span className="text-foreground/80">After Commission</span><span className="text-right font-semibold">: ₹{afterCommission.toFixed(2)}</span>
          <span className="text-foreground/80">Passing</span><span className="text-right font-semibold">: {passingAmount} = ₹{passingTotal.toFixed(2)} (x{passingMultiplier})</span>
        </div>
        <Separator className="my-2 bg-border/50" />
        <div className="grid grid-cols-2 gap-x-4">
          <span className="font-bold text-base">Final Total</span><span className="text-right font-bold text-base text-green-400">: ₹{finalTotal.toFixed(2)}</span>
        </div>
        <Separator className="my-2 bg-border/50" />
      </div>

       <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Declare Result for Draw {drawName}</DialogTitle>
          </DialogHeader>
          <div className="my-4 text-center">
            <p className="text-lg">Are you sure you want to declare or undeclare the number <strong className="text-primary">{numberToDeclare}</strong>?</p>
          </div>
          <DialogFooter>
            <Button onClick={handleUndeclare} variant="destructive">Undeclare</Button>
            <Button onClick={handleDeclare}>Declare</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


export default function AccountsManager({ accounts, clients, setAccounts }: AccountsManagerProps) {
  const handleUpdateDraw = (accountId: string, drawName: string, newDrawData: DrawData) => {
    setAccounts(accounts.map(acc => {
      if (acc.id === accountId) {
        const client = clients.find(c => c.id === acc.id);
        const clientCommissionPercent = client ? parseFloat(client.comm) / 100 : 0;
        const passingMultiplier = client ? parseFloat(client.pair) : 0;

        const currentDraws = acc.draws || {};
        const updatedDraws = { ...currentDraws, [drawName]: newDrawData };

        const totalAmount = newDrawData.totalAmount;
        const commissionAmount = totalAmount * clientCommissionPercent;
        const netAmount = totalAmount - commissionAmount;

        const passingAmount = newDrawData.passingAmount || 0;
        const passingTotal = passingAmount * passingMultiplier;

        const finalTotalForDraw = netAmount - passingTotal;

        // Re-calculate the grand total balance for the client
        const newBalance = Object.values(updatedDraws).reduce((balance, draw) => {
            const drawTotalAmount = draw.totalAmount || 0;
            const drawCommission = drawTotalAmount * clientCommissionPercent;
            const drawNet = drawTotalAmount - drawCommission;
            const drawPassingTotal = (draw.passingAmount || 0) * passingMultiplier;
            return balance + (drawNet - drawPassingTotal);
        }, 0);
        
        return {
          ...acc,
          draws: updatedDraws,
          balance: newBalance.toFixed(2),
        };
      }
      return acc;
    }));
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Account Ledger</CardTitle>
      </CardHeader>
      <CardContent>
         <Accordion type="single" collapsible className="w-full space-y-2">
            {accounts.map((account, index) => {
              const client = clients.find(c => c.id === account.id);
              return (
                <AccordionItem value={account.id} key={account.id} className="border bg-card rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex justify-between w-full">
                      <span>{index + 1}. {account.clientName}</span>
                      <span className="font-bold text-green-400 mr-4">₹{account.balance}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Tabs defaultValue={draws[0]} className="w-full">
                      <TabsList className="grid w-full grid-cols-6 h-auto">
                        {draws.map(draw => (
                           <TabsTrigger key={draw} value={draw} className="text-xs px-1">{draw}</TabsTrigger>
                        ))}
                      </TabsList>
                      {draws.map(draw => (
                        <TabsContent key={draw} value={draw}>
                           <DrawDetailsPanel 
                              client={client}
                              account={account}
                              drawName={draw} 
                              drawData={account.draws ? account.draws[draw] : undefined}
                              onUpdate={handleUpdateDraw}
                           />
                        </TabsContent>
                      ))}
                    </Tabs>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
        </Accordion>
      </CardContent>
    </Card>
  )
}
