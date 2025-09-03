
"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"

export type Account = {
  id: string
  clientName: string
  gameTotal: string
  commission: string
  balance: string
}

type AccountsManagerProps = {
  accounts: Account[];
  setAccounts: (accounts: Account[]) => void;
};

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
    } else {
      const newAccount: Account = { id: Date.now().toString(), clientName, gameTotal, commission, balance }
      setAccounts([...accounts, newAccount])
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

  const openAddDialog = () => {
    setEditingAccount(null)
    setIsDialogOpen(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manage Accounts</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if(!open) {
            setEditingAccount(null)
          }
          setIsDialogOpen(open)
        }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openAddDialog}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? "Edit Account" : "Add New Account"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <Label htmlFor="clientName">Client Name</Label>
                <Input id="clientName" name="clientName" defaultValue={editingAccount?.clientName} required />
              </div>
              <div>
                <Label htmlFor="gameTotal">Game Total</Label>
                <Input id="gameTotal" name="gameTotal" defaultValue={editingAccount?.gameTotal} required />
              </div>
              <div>
                <Label htmlFor="commission">Commission</Label>
                <Input id="commission" name="commission" defaultValue={editingAccount?.commission} required />
              </div>
              <div>
                <Label htmlFor="balance">Balance</Label>
                <Input id="balance" name="balance" defaultValue={editingAccount?.balance} required />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Game Total</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map(account => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.clientName}</TableCell>
                  <TableCell>{account.gameTotal}</TableCell>
                  <TableCell>{account.commission}</TableCell>
                  <TableCell>{account.balance}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive" onClick={() => handleDeleteAccount(account.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
