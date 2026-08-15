export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled", "completed"] as const

export type BookingStatus = (typeof BOOKING_STATUSES)[number]

interface BookingRequestFields {
    date: string | Date
    time: string
    userId: string
    salonId: string
    serviceId: string
}

interface PolicyResult {
    allowed: boolean
    error?: string
}

interface AcceptBookingPolicyInput {
    status: string
    hasConfirmedConflict: boolean
}

interface BookingDecisionMessageInput {
    decision: "accepted" | "rejected"
    salonName: string
    serviceName: string
    date: string | Date
    time: string
}

interface BookingVisitorCancellationMessageInput {
    serviceName: string
    date: string | Date
    time: string
}

export function isBookingStatus(status: string): status is BookingStatus {
    return BOOKING_STATUSES.includes(status as BookingStatus)
}

export function getBookingStatusLabel(status: string): string {
    const labels: Record<BookingStatus, string> = {
        pending: "Függőben",
        confirmed: "Elfogadva",
        cancelled: "Elutasítva",
        completed: "Teljesítve",
    }

    return isBookingStatus(status) ? labels[status] : "Ismeretlen"
}

export function canHandleBookingRequest(status: string): PolicyResult {
    if (!isBookingStatus(status)) {
        return { allowed: false, error: "Érvénytelen foglalási státusz." }
    }

    if (status !== "pending") {
        return { allowed: false, error: "Csak függőben lévő foglalási kérést lehet kezelni." }
    }

    return { allowed: true }
}

export function canAcceptBookingRequest(input: AcceptBookingPolicyInput): PolicyResult {
    const handleCheck = canHandleBookingRequest(input.status)
    if (!handleCheck.allowed) return handleCheck

    if (input.hasConfirmedConflict) {
        return { allowed: false, error: "Erre az időpontra már van elfogadott foglalás." }
    }

    return { allowed: true }
}

export function canCancelMyBooking(status: string): PolicyResult {
    if (!isBookingStatus(status)) {
        return { allowed: false, error: "Érvénytelen foglalási státusz." }
    }

    if (status !== "pending") {
        return { allowed: false, error: "Csak függőben lévő időpontkérést lehet visszavonni." }
    }

    return { allowed: true }
}

export function formatBookingDecisionMessage(input: BookingDecisionMessageInput) {
    const date = new Date(input.date).toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
    const isAccepted = input.decision === "accepted"
    const verb = isAccepted ? "elfogadta" : "elutasította"

    return {
        subject: isAccepted ? "Időpontkérés elfogadva" : "Időpontkérés elutasítva",
        content: `A(z) ${input.salonName} ${verb} az időpontkérésedet: ${input.serviceName}, ${date} ${input.time}.`,
    }
}

export function formatBookingVisitorCancellationMessage(input: BookingVisitorCancellationMessageInput) {
    const date = new Date(input.date).toLocaleDateString("hu-HU", {
        year: "numeric",
        month: "short",
        day: "numeric",
    })

    return {
        subject: "Időpontkérés visszavonva",
        content: `A vendég visszavonta az időpontkérését: ${input.serviceName}, ${date} ${input.time}.`,
    }
}

export function validateBookingRequestFields(data: BookingRequestFields): PolicyResult {
    if (!data.userId || !data.salonId || !data.serviceId) {
        return { allowed: false, error: "Hiányzó foglalási adatok." }
    }

    const date = new Date(data.date)
    if (Number.isNaN(date.getTime())) {
        return { allowed: false, error: "Érvénytelen foglalási dátum." }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) {
        return { allowed: false, error: "Múltbeli dátumra nem lehet foglalást létrehozni." }
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time)) {
        return { allowed: false, error: "Érvénytelen foglalási időpont." }
    }

    return { allowed: true }
}
