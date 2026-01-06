'use client';

import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

interface User {
    id: string;
    name: string;
    avatarUrl?: string;
}

interface UserSelectProps {
    value?: string;
    onChange: (value: string, user?: User) => void;
    placeholder?: string;
    className?: string;
}

export function UserSelect({ value, onChange, placeholder = "Select user...", className }: UserSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [users, setUsers] = React.useState<User[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch('/api/users');
                if (response.ok) {
                    const data = await response.json();
                    setUsers(data);
                }
            } catch (error) {
                console.error('Failed to fetch users:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const selectedUser = users.find((user) => user.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between", className)}
                >
                    {selectedUser ? selectedUser.name : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                        <CommandEmpty>No user found.</CommandEmpty>
                        <CommandGroup>
                            {users.map((user) => (
                                <CommandItem
                                    key={user.id}
                                    value={user.name}
                                    onSelect={() => {
                                        onChange(user.id === value ? "" : user.id, user.id === value ? undefined : user);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === user.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {user.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
