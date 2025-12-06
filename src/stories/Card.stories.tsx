import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof Card> = {
    title: 'UI/Card',
    component: Card,
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
    render: () => (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card Description</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Card Content</p>
            </CardContent>
            <CardFooter>
                <Button>Action</Button>
            </CardFooter>
        </Card>
    ),
};

export const EventCard: Story = {
    render: () => (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Community Iftar 2024</CardTitle>
                <CardDescription>Dec 15, 2024 • London Central Mosque</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">45 / 100 tickets sold</p>
                        <p className="text-lg font-semibold">£450 revenue</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline">Edit</Button>
                <Button>View</Button>
            </CardFooter>
        </Card>
    ),
};

export const StatsCard: Story = {
    render: () => (
        <Card className="w-[200px]">
            <CardHeader className="pb-2">
                <CardDescription>Total Events</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">+2 this month</p>
            </CardContent>
        </Card>
    ),
};
