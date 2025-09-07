
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

  const totalAmount = drawData?.totalAmount || 0;
  const clientCommissionPercent = client ? parseFloat(client.comm) / 100 : 0.10;
  const commission = totalAmount * clientCommissionPercent;
  const afterCommission = totalAmount - commission;
  const passingAmount = drawData?.passingAmount || 0;
  const passingMultiplier = client ? parseFloat(client.pair) : 90;
  const passingTotal = passingAmount * passingMultiplier;
  const finalTotal = afterCommission - passingTotal;
  
  return (
    <>
      <div className="p-4 bg-muted/50 rounded-lg text-sm font-mono">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-foreground/80">User Name</span><span className="text-right font-semibold text-primary">: {client?.name || 'N/A'}</span>
          <span className="text-foreground/80">Draw Name ({drawName}) Total</span>
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
