import { useState } from "react";
import { z } from "zod";
import clsx from "clsx";
import { useAccount } from "wagmi";
import { useFormContext } from "react-hook-form";
import { Check } from "lucide-react";

import { Button, IconButton } from "~/components/ui/Button";
import { formatNumber } from "~/utils/formatNumber";
import { Dialog } from "~/components/ui/Dialog";
import { Form } from "~/components/ui/Form";
import {
  ballotContains,
  useAddToBallot,
  useBallot,
  useRemoveFromBallot,
  sumBallot,
} from "~/features/ballot/hooks/useBallot";
import { AllocationInput } from "~/features/ballot/components/AllocationInput";

export const MAX_ALLOCATION_PROJECT = Number(
  process.env.NEXT_PUBLIC_MAX_ALLOCATION_PROJECT!,
);
export const MAX_ALLOCATION_TOTAL = Number(
  process.env.NEXT_PUBLIC_MAX_ALLOCATION_TOTAL!,
);

type Props = { id?: string; name?: string };
export const ProjectAddToBallot = ({ id, name }: Props) => {
  const { address } = useAccount();
  const [isOpen, setOpen] = useState(false);
  const add = useAddToBallot();
  const remove = useRemoveFromBallot();
  const { data: ballot } = useBallot();

  const inBallot = ballotContains(id!, ballot);
  const allocations = ballot?.votes ?? [];
  const sum = sumBallot(allocations.filter((p) => p.projectId !== id));

  return (
    <div>
      {ballot?.publishedAt ? (
        <Button disabled>Ballot published</Button>
      ) : inBallot ? (
        <IconButton
          onClick={() => setOpen(true)}
          variant="primary"
          icon={Check}
        >
          {formatNumber(inBallot.amount)} allocated
        </IconButton>
      ) : (
        <Button
          // disabled={!address}
          onClick={() => setOpen(true)}
          variant="primary"
          // icon={AddBallot}
          className="w-full md:w-auto"
        >
          Add to ballot
        </Button>
      )}
      <Dialog isOpen={isOpen} onOpenChange={setOpen} title={`Vote for ${name}`}>
        <p className="pb-4 leading-relaxed">
          How much OP should this Project receive to fill the gap between the
          impact they generated for Optimism and the profit they received for
          generating this impact
        </p>
        <Form
          defaultValues={{ amount: inBallot?.amount }}
          schema={z.object({
            amount: z
              .number()
              .min(0)
              .max(Math.min(MAX_ALLOCATION_PROJECT, MAX_ALLOCATION_TOTAL - sum))
              .default(0),
          })}
          onSubmit={({ amount }) => {
            add.mutate([{ projectId: id!, amount }]);
            setOpen(false);
          }}
        >
          <ProjectAllocation
            current={sum}
            inBallot={Boolean(inBallot)}
            onRemove={() => {
              remove.mutate(id!);
              setOpen(false);
            }}
          />
        </Form>
      </Dialog>
    </div>
  );
};

const ProjectAllocation = ({
  current = 0,
  inBallot,
  onRemove,
}: {
  current: number;
  inBallot: boolean;
  onRemove: () => void;
}) => {
  const form = useFormContext();
  const formAmount = form.watch("amount") as string;
  const amount = formAmount
    ? parseFloat(String(formAmount).replace(/,/g, ""))
    : 0;
  const total = amount + current;

  const exceededProjectOP = amount > MAX_ALLOCATION_PROJECT;
  const exceededMaxOP = total > MAX_ALLOCATION_TOTAL;

  const isError = exceededProjectOP || exceededMaxOP;
  return (
    <div>
      <AllocationInput error={isError} name="amount" />
      <div className="flex justify-between gap-2 pt-2 text-sm">
        <div className="flex gap-2">
          <span className="text-gray-600 dark:text-gray-400">
            Total allocated:
          </span>
          <span
            className={clsx("font-semibold", {
              ["text-primary-500"]: exceededMaxOP,
            })}
          >
            {formatNumber(total)}
          </span>
        </div>
        <div className="flex gap-2">
          <span
            className={clsx("font-semibold", {
              ["text-primary-500"]: exceededProjectOP,
            })}
          >
            {formatNumber(amount)}
          </span>
          <span className="text-gray-600 dark:text-gray-400">/</span>
          <span className="text-gray-600 dark:text-gray-400">
            {formatNumber(MAX_ALLOCATION_PROJECT)}
          </span>
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <Button
          variant="primary"
          type="submit"
          className="w-full"
          disabled={isError}
        >
          {inBallot ? "Update" : "Add"} votes
        </Button>
        {inBallot ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={onRemove}
          >
            Remove from ballot
          </Button>
        ) : null}
      </div>
    </div>
  );
};