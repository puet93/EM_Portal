-- DropForeignKey
ALTER TABLE "TrackingInfo" DROP CONSTRAINT "TrackingInfo_fulfillmentId_fkey";

-- AddForeignKey
ALTER TABLE "TrackingInfo" ADD CONSTRAINT "TrackingInfo_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "Fulfillment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
