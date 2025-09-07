
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"

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
  const clientCommissionPercent = client ? parseFloat(client.comm) / 100 : 0.10;
  const commission = totalAmount * clientCommissionPercent;
  const afterCommission = totalAmount - commission;
  
  const passingAmount = drawData?.passingAmount || 0;
  const passingMultiplier = client ? parseFloat(client.pair) : 90;
  const passingTotal = passingAmount * passingMultiplier;

  const finalTotal = afterCommission - passingTotal;
  
  return (
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
  )
}

const ClientDetailsDialog = ({ client, account, children }: { client: Client | undefined; account: Account, children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Account Details: {account.clientName}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
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
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function AccountsManager({ accounts, clients, setAccounts }: AccountsManagerProps) {
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Account Ledger</CardTitle>
      </CardHeader>
      <CardContent>
         <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SI.No</TableHead>
              <TableHead>Client Name</TableHead>
              <TableHead>Total</TableHead>
              <TableHead><Checkbox /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account, index) => {
              const client = clients.find(c => c.id === account.id);
              return (
                 <ClientDetailsDialog key={account.id} client={client} account={account}>
                    <TableRow className="cursor-pointer">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{account.clientName}</TableCell>
                      <TableCell className="font-bold text-green-400">₹{account.balance}</TableCell>
                      <TableCell>
                        <Checkbox onClick={(e) => e.stopPropagation()} />
                      </TableCell>
                    </TableRow>
                  </ClientDetailsDialog>
              )
            })}
          </TableBody>
         </Table>
      </CardContent>
    </Card>
  )
}
