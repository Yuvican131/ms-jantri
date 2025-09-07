
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
  setAccounts: (accounts: Account[]) => void;
};

const draws = ["DD", "ML", "FB", "GB", "GL", "DS"];

const DrawDetailsPanel = ({ clientName, drawName, drawData }: { clientName: string, drawName: string, drawData: DrawData | undefined }) => {
  const totalAmount = drawData?.totalAmount || 0;
  const commission = totalAmount * 0.10;
  const afterCommission = totalAmount - commission;
  const passingAmount = drawData?.passingAmount || 0;
  const passingMultiplier = drawData?.multiplier || 90;
  const passingTotal = passingAmount * passingMultiplier;
  const finalTotal = afterCommission - passingTotal;

  return (
    <div className="p-4 bg-muted/50 rounded-lg text-sm font-mono">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <span className="text-foreground/80">User Name</span><span className="text-right font-semibold text-primary">: {clientName}</span>
        <span className="text-foreground/80">Draw Name (Total)</span><span className="text-right font-semibold">: ₹{totalAmount.toFixed(2)}</span>
        <span className="text-foreground/80">10% Commission Amt</span><span className="text-right font-semibold">: ₹{commission.toFixed(2)}</span>
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


export default function AccountsManager({ accounts, setAccounts }: AccountsManagerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  
  const handleSaveAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const clientName = formData.get("clientName") as string
    const gameTotal = formData.get("gameTotal") as string
    const commission = formData.get("commission") as string
    const balance = formData.get("balance") as string

    if (editingAccount) {
      setAccounts(accounts.map(a => a.id === editingAccount.id ? { ...a, clientName, gameTotal, commission, balance } : a))
    }
    setEditingAccount(null)
    setIsDialogOpen(false)
    e.currentTarget.reset();
  }

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
    setIsDialogOpen(true)
  }

  const handleDeleteAccount = (id: string) => {
    setAccounts(accounts.filter(a => a.id !== id))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Account Ledger</CardTitle>
      </CardHeader>
      <CardContent>
         <Accordion type="single" collapsible className="w-full space-y-2">
            {accounts.map((account, index) => (
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
                            clientName={account.clientName} 
                            drawName={draw} 
                            drawData={account.draws ? account.draws[draw] : undefined}
                         />
                      </TabsContent>
                    ))}
                  </Tabs>
                </AccordionContent>
              </AccordionItem>
            ))}
        </Accordion>
      </CardContent>
    </Card>
  )
}
