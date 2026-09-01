import type { Meta, StoryObj } from "@storybook/nextjs";
import { useState, type ComponentProps } from "react";
import { ReceiveModal } from "./ReceiveModal";

const SAMPLE_ADDRESS =
  "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWNA";

function ReceiveModalDemo(
  props: Omit<ComponentProps<typeof ReceiveModal>, "open" | "onClose">,
) {
  const [open, setOpen] = useState(true);
  return <ReceiveModal {...props} open={open} onClose={() => setOpen(false)} />;
}

const meta = {
  title: "Components/ReceiveModal",
  component: ReceiveModalDemo,
  parameters: { layout: "fullscreen" },
  args: {
    address: SAMPLE_ADDRESS,
    network: "testnet",
    variant: "primary",
    loading: false,
    disabled: false,
  },
  argTypes: {
    variant: {
      control: { type: "select", options: ["primary", "secondary"] },
    },
    network: {
      control: { type: "select", options: ["mainnet", "testnet"] },
    },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
  },
} satisfies Meta<typeof ReceiveModalDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: { variant: "secondary" },
};

export const Loading: Story = {
  args: { loading: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Mainnet: Story = {
  args: { network: "mainnet" },
};

export const WithError: Story = {
  args: { error: "Unable to load your receive address. Please try again." },
};
