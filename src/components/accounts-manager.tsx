"use client"
import { useState, useEffect, useMemo } from "react"
import { useToast } from "@/hooks/use-toast"
import { suggestAccountNames, SuggestAccountNamesOutput } from "@/ai/flows/suggest-account-names"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type Account = {
  id: string
  name: string
  number: string
  notes: string
}

const initialAccounts: Account[] = [
  { id: "1", name: "Accounts Receivable", number: "1200", notes: "All outstanding invoices." },
  { id: "2", name: "Accounts Payable", number: "2100", notes: "All outstanding bills." },
  { id: "3", name: "Sales Revenue", number: "4000", notes: "Revenue from primary business operations." },
]

export default function AccountsManager() {
  const { toast } = useToast()
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [partialName, setPartialName] = useState("")
  const [accountName, setAccountName] = useState("")

  const debouncedPartialName = useMemo(() => {
    const handler = setTimeout(() => {
      setPartialName(accountName);
    }, 500);
    return () => clearTimeout(handler);
  }, [accountName]);
  
  useEffect(() => {
    debouncedPartialName;
  }, [debouncedPartialName]);

  useEffect(() => {
    if (partialName.length < 3) {
      setSuggestions([])
      return
    }

    const fetchSuggestions = async () => {
      setIsSuggesting(true)
      try {
        const result: SuggestAccountNamesOutput = await suggestAccountNames({ partialAccountName: partialName })
        setSuggestions(result.suggestedAccountNames)
      } catch (error) {
        console.error("Error fetching suggestions:", error)
        toast({ title: "Error", description: "Could not fetch AI suggestions.", variant: "destructive" })
      } finally {
        setIsSuggesting(false)
      }
    };
    
    fetchSuggestions();
  }, [partialName, toast])
  
  const handleSaveAccount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = accountName
    const number = formData.get("number") as string
    const notes = formData.get("notes") as string

    if (editingAccount) {
      setAccounts(accounts.map(a => a.id === editingAccount.id ? { ...a, name, number, notes } : a))
    } else {
      const newAccount: Account = { id: Date.now().toString(), name, number, notes }
      setAccounts([...accounts, newAccount])
    }
    setEditingAccount(null)
    setAccountName("")
    setPartialName("")
    setSuggestions([])
    setIsDialogOpen(false)
  }

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
    setAccountName(account.name)
    setIsDialogOpen(true)
  }

  const handleDeleteAccount = (id: string) => {
    setAccounts(accounts.filter(a => a.id !== id))
  }

  const openAddDialog = () => {
    setEditingAccount(null)
    setAccountName("")
    setPartialName("")
    setSuggestions([])
    setIsDialogOpen(true)
  }

  const handleSuggestionClick = (suggestion: string) => {
    setAccountName(suggestion)
    setPartialName(suggestion)
    setSuggestions([])
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manage Accounts</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if(!open) {
            setEditingAccount(null)
            setAccountName("")
            setPartialName("")
            setSuggestions([])
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
                <Label htmlFor="name">Account Name</Label>
                <Popover open={suggestions.length > 0 && partialName.length > 0}>
                  <PopoverTrigger asChild>
                    <div className="relative">
                      <Input 
                        id="name" 
                        name="name" 
                        value={accountName}
                        onChange={(e) => {
                          setAccountName(e.target.value)
                        }} 
                        required 
                        autoComplete="off"
                      />
                      {isSuggesting && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <div className="flex flex-col">
                      {suggestions.map((s, i) => (
                        <button key={i} type="button" onClick={() => handleSuggestionClick(s)} className="text-left p-2 hover:bg-accent rounded-md">
                          {s}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="number">Account Number</Label>
                <Input id="number" name="number" defaultValue={editingAccount?.number} required />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" defaultValue={editingAccount?.notes} />
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Name</TableHead>
              <TableHead>Account Number</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map(account => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell>{account.number}</TableCell>
                <TableCell className="max-w-[300px] truncate">{account.notes}</TableCell>
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
      </CardContent>
    </Card>
  )
}
