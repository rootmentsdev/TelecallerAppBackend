import Complaint from '../models/Complaint.js';
import mongoose from 'mongoose';

// Map common request body keys to Complaint schema fields
const COMPLAINT_FIELD_MAP = {
    customer_name: 'name',
    name: 'name',
    phone_number: 'phone',
    phone: 'phone',
    store_location: 'store',
    store: 'store',
    call_status: 'callStatus',
    lead_status: 'leadStatus',
    remarks: 'remarks',
    subCategory: 'subCategory',
    sub_category: 'subCategory',
    itemCategory: 'itemCategory',
    item_category: 'itemCategory',
    closingAction: 'closingAction',
    closing_action: 'closingAction',
};

// PATCH - Update Complaint Call (Re-Call) and optionally update complaint fields (name, phone, store, etc.)
export const updateComplaintCall = async (req, res) => {
    try {
        const { id } = req.params;
        const { call_duration, complaint_remarks, remarks: remarksAlias, ...restBody } = req.body;
        const complaint_remarks_val = complaint_remarks ?? remarksAlias ?? "";

        // Validate inputs - call_duration required for logging a re-call
        if (call_duration === undefined || call_duration === null) {
            return res.status(400).json({ message: "call_duration is required" });
        }

        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        // Access Control
        if (req.user.role === 'telecaller') {
            const userIdStr = req.user._id.toString();
            const ownerId = complaint.complaintMarkedBy?._id || complaint.complaintMarkedBy;
            const ownerIdStr = ownerId ? ownerId.toString() : null;
            const assignedId = complaint.assignedTo?._id || complaint.assignedTo;
            const assignedIdStr = assignedId ? assignedId.toString() : null;

            if (ownerIdStr !== userIdStr && assignedIdStr !== userIdStr) {
                return res.status(403).json({ message: "Access denied. You can only update calls for your own complaints or complaints assigned to you." });
            }
        }

        // Update complaint document fields if sent (customer_name, phone_number, store_location, etc.)
        Object.keys(COMPLAINT_FIELD_MAP).forEach((key) => {
            if (restBody[key] !== undefined && restBody[key] !== null) {
                const schemaKey = COMPLAINT_FIELD_MAP[key];
                complaint[schemaKey] = restBody[key];
            }
        });

        if (restBody.refund_status !== undefined) {
            const isReturn = (complaint.leadType === 'return' || complaint.lead_type === 'return');
            complaint.refund_status = isReturn ? restBody.refund_status : null;
        }

        // Re-call: overwrite callDuration with new value and set complaint_remarks
        complaint.callDuration = parseInt(call_duration, 10) || 0;
        complaint.complaint_remarks = complaint_remarks_val ? String(complaint_remarks_val) : "";

        await complaint.save();

        res.json({
            message: "Complaint call recorded successfully",
            complaint
        });

    } catch (error) {
        console.error("Error updating complaint call:", error);
        res.status(500).json({ message: error.message });
    }
};
