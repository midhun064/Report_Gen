import React from 'react';
import { useForm } from '../../context/FormContext';
import UserFormsManager from './UserFormsManager';
import FormsManager from './FormsManager';
import LeaveRequestForm from './LeaveRequestForm';
import ExpenseReimbursementForm from './ExpenseReimbursementForm';
import ITAccessRequestForm from './ITAccessRequestForm';
import TrainingRequestForm from './TrainingRequestForm';
import EquipmentRequestForm from './EquipmentRequestForm';
import FacilityAccessForm from './FacilityAccessForm';
import PasswordResetForm from './PasswordResetForm';
import PurchaseRequisitionForm from './PurchaseRequisitionForm';
import GenericFormDataList from './GenericFormDataList';

const FormRouter: React.FC = () => {
  const { currentForm } = useForm();

  switch (currentForm) {
    case 'none':
      return <UserFormsManager />;
    case 'all-forms':
      return <FormsManager />;
    case 'leave-request':
      return <LeaveRequestForm />;
    case 'expense-reimbursement':
      return <ExpenseReimbursementForm />;
    case 'training-request':
      return <TrainingRequestForm />;
    case 'equipment-request':
      return <EquipmentRequestForm />;
    case 'it-support':
    case 'it-access':
      return <ITAccessRequestForm />;
    case 'facility-access':
      return <FacilityAccessForm />;
    case 'password-reset':
      return <PasswordResetForm />;
    case 'purchase-requisition':
      return <PurchaseRequisitionForm />;
    // Add more form cases as needed
    case 'exit-clearance':
    case 'travel-request':
    case 'info-update':
    case 'petty-cash':
    case 'medical-claim':
    case 'mileage-claim':
    case 'it-incident':
    case 'meeting-room':
    case 'transport-request':
    case 'maintenance-request':
    case 'safety-incident':
    case 'employee-onboarding':
    case 'nda-request':
    case 'contract-approval':
      // Generic data viewer for forms backed by aggregated API data
      return <GenericFormDataList />;
    default:
      return <FormsManager />;
  }
};

export default FormRouter;
