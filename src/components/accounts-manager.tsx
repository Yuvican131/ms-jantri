
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
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
  balance: string
  draws?: { [key: string]: DrawData }
}

type DrawData = {
  totalAmount: number;
  passingAmount: number;
}

type AccountsManagerProps = {
  accounts: Account[];
  clients: Client[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
};

const draws = ["DD", "ML", "FB", "GB", "GL", "DS"];

const formatNumber = (num: number) => {
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
};

const DrawDetailsPanel = ({
  client,
  account,
  drawName,
  drawData,
}: {
  client: Client | undefined;
  account: Account;
  drawName: string;
  drawData: DrawData | undefined;
}) => {

  const totalAmount = drawData?.totalAmount || 0;
  if (totalAmount === 0) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg text-sm font-mono text-center text-muted-foreground">
        No entries for this draw.
      </div>
    )
  }

  const clientCommissionPercent = client ? parseFloat(client.comm) / 100 : 0.10;
  const commission = totalAmount * clientCommissionPercent;
  const afterCommission = totalAmount - commission;
  
  const passingAmount = drawData?.passingAmount || 0;
  const passingMultiplier = client ? parseFloat(client.pair) : 90;
  const passingTotal = passingAmount * passingMultiplier;

  const finalTotal = afterCommission - passingTotal;
  const finalTotalColor = finalTotal < 0 ? 'text-red-500' : 'text-green-400';

  const activeBalance = client ? parseFloat(client.activeBalance) || 0 : 0;
  const totalPlayed = account.draws ? Object.values(account.draws).reduce((sum, d) => sum + (d?.totalAmount || 0), 0) : 0;
  const remainingBalance = activeBalance - totalPlayed;
  
  return (
    <div className="p-4 bg-muted/50 rounded-lg text-sm font-mono">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-foreground/80">User Name</span><span className="text-right font-semibold text-primary">: {client?.name || 'N/A'}</span>
        {activeBalance > 0 && (
          <>
            <span className="text-foreground/80">Active Balance</span><span className="text-right font-semibold">: ₹{formatNumber(activeBalance)}</span>
            <span className="text-foreground/80">Total Played</span><span className="text-right font-semibold">: ₹{formatNumber(totalPlayed)}</span>
            <span className="text-foreground/80">Remaining Balance</span><span className={`text-right font-semibold ${remainingBalance < 0 ? 'text-red-500' : 'text-green-400'}`}>: ₹{formatNumber(remainingBalance)}</span>
            <Separator className="my-1 col-span-2 bg-border/50" />
          </>
        )}
        <span className="text-foreground/80">Draw ({drawName}) Total</span><span className="text-right font-semibold">: ₹{formatNumber(totalAmount)}</span>
        <span className="text-foreground/80">{clientCommissionPercent*100}% Commission Amt</span><span className="text-right font-semibold">: ₹{formatNumber(commission)}</span>
        <span className="text-foreground/80">After Commission</span><span className="text-right font-semibold">: ₹{formatNumber(afterCommission)}</span>
        <span className="text-foreground/80">Passing</span>
        <span className="text-right font-semibold">
          : {passingAmount > 0 ? `${formatNumber(passingAmount)} = ` : ''}₹{formatNumber(passingTotal)} {passingAmount > 0 ? `(x${passingMultiplier})` : ''}
        </span>
      </div>
      <Separator className="my-2 bg-border/50" />
      <div className="grid grid-cols-2 gap-x-4">
        <span className="font-bold text-base">Final Total ({drawName})</span>
        <span className={`text-right font-bold text-base ${finalTotalColor}`}>: ₹{formatNumber(finalTotal)}</span>
      </div>
    </div>
  )
}

export default function AccountsManager({ accounts, clients, setAccounts }: AccountsManagerProps) {
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Account Ledger</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {accounts.map((account, index) => {
            const client = clients.find(c => c.id === account.id);
            const balanceValue = parseFloat(account.balance) || 0;
            const balanceColor = balanceValue >= 0 ? 'text-green-400' : 'text-red-500';
            return (
              <AccordionItem value={`item-${index}`} key={account.id}>
                <AccordionTrigger>
                    <div className="flex justify-between w-full pr-4">
                        <span>{index + 1}. {account.clientName}</span>
                        <span className={`font-bold ${balanceColor}`}>₹{formatNumber(balanceValue)}</span>
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
