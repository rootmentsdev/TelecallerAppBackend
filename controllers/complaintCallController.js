import Complaint from '../models/Complaint.js';
import mongoose from 'mongoose';

// PATCH - Update Complaint Call (Re-Call)
export const updateComplaintCall = async (req, res) => {
    try {
        const { id } = req.params;
        const { call_duration, complaint_remarks } = req.body;

        // Validate inputs
        // Allow 0 duration calls (maybe just logging attempts), but usually > 0
        if (call_duration === undefined || call_duration === null) {
            return res.status(400).json({ message: "call_duration is required" });
        }

        const complaint = await Complaint.findById(id);
        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found" });
        }

        // Access Control
        // Telecallers can only call their own complaints OR complaints assigned to them
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

        const callEntry = {
            calledAt: new Date(),
            callDuration: parseInt(call_duration) || 0,
            remarks: complaint_remarks || "",
            calledBy: req.user._id
        };

        // Update Complaint History
        if (!complaint.complaint_call_history) complaint.complaint_call_history = [];
        complaint.complaint_call_history.push(callEntry);

        // Accumulate total duration
        const currentTotal = (complaint.total_complaint_call_duration || complaint.callDuration || 0);
        complaint.total_complaint_call_duration = currentTotal + callEntry.callDuration;

        // Update Summary Fields
        complaint.last_called_at = callEntry.calledAt;
        complaint.last_call_duration = callEntry.callDuration;
        complaint.last_complaint_remarks = callEntry.remarks || complaint.last_complaint_remarks; // Keep old remarks if new is empty? Or overwrite? 
        // Requirement: "store... remarks". Assuming overwrite with latest call remarks.
        if (callEntry.remarks) complaint.last_complaint_remarks = callEntry.remarks;

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
