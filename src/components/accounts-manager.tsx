
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
import { formatNumber } from "@/lib/utils"
import { TrendingUp, TrendingDown, HandCoins, Landmark, CircleDollarSign, Trophy } from 'lucide-react';


export type DrawData = {
  totalAmount: number;
  passingAmount: number;
}

export type Account = {
  id: string
  clientName: string
  balance: string
  draws?: { [key: string]: DrawData }
}

type AccountsManagerProps = {
  accounts: Account[];
  clients: Client[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
};

const draws = ["DD", "ML", "FB", "GB", "GL", "DS"];

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
      <div className="p-4 bg-muted/50 rounded-lg text-sm font-mono border text-center text-muted-foreground italic">
        No entries for {drawName}.
      </div>
    );
  }

  const clientCommissionPercent = client ? parseFloat(client.comm) / 100 : 0.10;
  const commission = totalAmount * clientCommissionPercent;
  const afterCommission = totalAmount - commission;
  
  const passingAmount = drawData?.passingAmount || 0;
  const passingMultiplier = client ? parseFloat(client.pair) : 90;
  const passingTotal = passingAmount * passingMultiplier;

  const finalTotal = afterCommission - passingTotal;
  const finalTotalColor = finalTotal < 0 ? 'text-red-500' : 'text-green-400';
  
  return (
    <div className="p-4 bg-muted/50 rounded-lg text-sm font-mono border">
      <h4 className="font-bold text-center text-base mb-2 text-primary">{drawName}</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-foreground/80">Total</span><span className="text-right font-semibold">: ₹{formatNumber(totalAmount)}</span>
        <span className="text-foreground/80">{clientCommissionPercent*100}% Comm</span><span className="text-right font-semibold">: ₹{formatNumber(commission)}</span>
        <span className="text-foreground/80">After Comm</span><span className="text-right font-semibold">: ₹{formatNumber(afterCommission)}</span>
        <span className="text-foreground/80">Passing</span>
        <span className="text-right font-semibold">
          : {passingAmount > 0 ? `${formatNumber(passingAmount)} = ` : ''}₹{formatNumber(passingTotal)} {passingAmount > 0 ? `(x${passingMultiplier})` : ''}
        </span>
      </div>
      <Separator className="my-2 bg-border/50" />
      <div className="grid grid-cols-2 gap-x-4">
        <span className="font-bold text-base">Final</span>
        <span className={`text-right font-bold text-base ${finalTotalColor}`}>: ₹{formatNumber(finalTotal)}</span>
      </div>
    </div>
  )
}

export default function AccountsManager({ accounts, clients, setAccounts }: AccountsManagerProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Manage Account Ledger</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-6 overflow-y-auto">
        <div>
            <h3 className="text-lg font-semibold mb-3 text-primary flex items-center gap-2">
                <HandCoins className="h-5 w-5" /> Client Ledgers
            </h3>
            <Accordion type="single" collapsible className="w-full">
              {accounts.map((account, index) => {
                const client = clients.find(c => c.id === account.id);
                const balanceValue = parseFloat(account.balance) || 0;
                const balanceColor = balanceValue >= 0 ? 'text-green-400' : 'text-red-500';

                const activeBalance = client ? parseFloat(client.activeBalance) || 0 : 0;
                const totalPlayed = account.draws ? Object.values(account.draws).reduce((sum, d) => sum + (d?.totalAmount || 0), 0) : 0;
                const remainingBalance = activeBalance - totalPlayed;
                const hasActiveDraws = account.draws && Object.values(account.draws).some(d => d.totalAmount > 0);

                return (
                  <AccordionItem value={`item-${index}`} key={account.id}>
                    <AccordionTrigger>
                        <div className="flex justify-between w-full pr-4">
                            <span>{index + 1}. {account.clientName}</span>
                            <span className={`font-bold ${balanceColor}`}>₹{formatNumber(balanceValue)}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="p-4 bg-card rounded-lg space-y-4">
                        {client && activeBalance > 0 && (
                           <div className="p-4 bg-muted/30 rounded-lg text-sm font-mono border">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              <span className="text-foreground/80">User Name</span><span className="text-right font-semibold text-primary">: {client?.name || 'N/A'}</span>
                              <span className="text-foreground/80">Active Balance</span><span className="text-right font-semibold">: ₹{formatNumber(activeBalance)}</span>
                              <span className="text-foreground/80">Total Played</span><span className="text-right font-semibold">: ₹{formatNumber(totalPlayed)}</span>
                              <Separator className="my-1 col-span-2 bg-border/50" />
                              <span className="text-foreground/80 font-bold">Remaining Balance</span><span className={`text-right font-bold ${remainingBalance < 0 ? 'text-red-500' : 'text-green-400'}`}>: ₹{formatNumber(remainingBalance)}</span>
                            </div>
                          </div>
                        )}
                        
                        {hasActiveDraws ? (
                          <Tabs defaultValue={draws[0]} className="w-full">
                            <TabsList className="grid w-full grid-cols-6 h-auto">
                              {draws.map(draw => (
                                <TabsTrigger key={draw} value={draw} className="text-xs px-1">
                                  {draw}
                                </TabsTrigger>
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
                        ) : (
                          <div className="text-center text-muted-foreground italic py-8">
                            No entries for this client.
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
        </div>
      </CardContent>
    </Card>
  )
}

    