import { readE2eFixtureConfig, resetE2eApplicant, seedE2eFixtures } from "./e2e-fixtures";

async function main(): Promise<void> {
  const resetApplicant = process.argv.includes("--reset-applicant");
  const config = readE2eFixtureConfig();

  if (resetApplicant) {
    const result = await resetE2eApplicant(config);
    console.log(
      result.removedUser
        ? `Reset dedicated E2E applicant (${result.removedApplications} application row(s) removed).`
        : "Dedicated E2E applicant was already absent.",
    );
    return;
  }

  const result = await seedE2eFixtures(config);
  console.log("E2E fixtures ready:");
  console.log(`  platform: ${config.platformEmail} [${result.platformUserId}]`);
  console.log(`  tenant: ${config.tenantEmail} [${result.tenantUserId}]`);
  console.log(`  tenant org: ${config.tenantOrganizationSlug} [${result.tenantOrganizationId}]`);
  console.log("  applicant: not provisioned by seed; use Request Trial or npm run e2e:reset-applicant");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
