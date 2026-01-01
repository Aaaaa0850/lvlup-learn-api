CREATE INDEX `subscription_referenceId_idx` ON `subscription` (`reference_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_stripeSubscriptionId_idx` ON `subscription` (`stripe_subscription_id`);--> statement-breakpoint
CREATE INDEX `subscription_stripeCustomerId_idx` ON `subscription` (`stripe_customer_id`);